import bcrypt from 'bcryptjs';
import db from '../db/db.js';

export async function signup(req, res) {
    let { username, password, role, location_coords } = req.body;
    role = role || 'user';

    if (!location_coords || !Array.isArray(location_coords)) {
        return res.status(400).json({ error: "Please select your location on the map." });
    }

    if (!['user', 'warehouse', 'transporter'].includes(role))
        return res.status(400).json({ error: "Role must be 'user', 'warehouse', or 'transporter'" });
    if (!username || !password)
        return res.status(400).json({ error: "Username or password field is empty!" });

    username = username.trim();
    if (!/^[a-zA-Z0-9_-]{1,20}$/.test(username))
        return res.status(400).json({ error: 'Username must be 1-20 characters, using letters, numbers, _ or -.' });

    try {
        const { data: existing } = await db
            .from('users')
            .select('"userID"')
            .eq('username', username)
            .single();

        if (existing)
            return res.status(400).json({ error: "Username already exists" });

        const hashed = await bcrypt.hash(password, 10);

        await db.from('users').insert({
            username,
            password: hashed,
            loggedIn: 0,
            role,
            location_coords: location_coords
        });

        return res.status(201).json({ Success: "Registration successful!" });
    } catch (err) {
        console.error('Registration error:', err.message);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
}

async function handleRoleLogin(req, res, expectedRole) {
    let { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ error: "Username or password field is empty!" });

    try {
        const { data: result } = await db
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (!result) return res.status(400).json({ error: "Wrong username or password" });
        if (result.role !== expectedRole)
            return res.status(403).json({ error: `Please use the ${expectedRole} login endpoint` });

        const isValid = await bcrypt.compare(password, result.password);
        if (!isValid) return res.status(400).json({ error: "Wrong username or password" });

        req.session.userId = result.userID;
        req.session.role = result.role;

        await db.from('users').update({ loggedIn: 1 }).eq('"userID"', result.userID);

        req.session.save((err) => {
            if (err) return res.status(500).json({ error: "Session synchronization failed" });
            res.status(200).json({
                Success: "Login successful!",
                userID: result.userID,
                role: result.role,
                location_coords: result.location_coords
            });
        });
    } catch (err) {
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
}

export const loginUser = (req, res) => handleRoleLogin(req, res, 'user');
export const loginWarehouse = (req, res) => handleRoleLogin(req, res, 'warehouse');
export const loginTransporter = (req, res) => handleRoleLogin(req, res, 'transporter');

export async function getWarehouses(req, res) {
    try {
        const { data, error } = await db
            .from('users')
            .select('"userID", username, location_coords')
            .eq('role', 'warehouse');

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: "Could not fetch warehouses." });
    }
}

async function performLogout(req, res) {
    if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });
    await db.from('users').update({ loggedIn: 0 }).eq('"userID"', req.session.userId);
    req.session.destroy(() => res.json({ message: 'Logged out' }));
}
export async function getMe(req, res) {
    if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    try {
        const { data: user, error } = await db.from('users')
            .select('userID, username, role, location_coords')
            .eq('userID', req.session.userId)
            .single();

        if (error || !user) return res.status(404).json({ error: "User not found" });
        return res.status(200).json(user);
    } catch (err) {
        return res.status(500).json({ error: "Failed to fetch session user" });
    }
}

export const logoutUser = performLogout;
export const logoutWarehouse = performLogout;
export const logoutTransporter = performLogout;