import bcrypt from 'bcryptjs'
import db from '../db/db.js'

export async function signup(req, res) {
    let { username, password, role } = req.body;
    role = role || 'user';
    if (!['user', 'warehouse'].includes(role))
        return res.status(400).json({ error: "Role must be 'user' or 'warehouse'" });
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
            role
        });

        return res.status(201).json({ Success: "User registered!" });
    } catch (err) {
        console.error('Registration error:', err.message);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
}

export async function loginUser(req, res) {
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

        if (result.role !== 'user')
        return res.status(403).json({ error: "Use the warehouse login endpoint" });

        const isValid = await bcrypt.compare(password, result.password);
        if (!isValid) return res.status(400).json({ error: "Wrong username or password" });

        req.session.userId = result.userID;

        await db.from('users').update({ loggedIn: 1 }).eq('"userID"', result.userID);

        res.status(200).json({ Success: "User Login successful!" });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
}

export async function loginWarehouse(req, res) {
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

        if (result.role !== 'warehouse')
        return res.status(403).json({ error: "Use the user login endpoint" });

        const isValid = await bcrypt.compare(password, result.password);
        if (!isValid) return res.status(400).json({ error: "Wrong username or password" });

        req.session.userId = result.userID;

        await db.from('users').update({ loggedIn: 1 }).eq('"userID"', result.userID);

        res.status(200).json({ Success: "User Login successful!" });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
}

async function performLogout(req, res) {
    if (!req.session.userId)
        return res.status(401).json({ error: "Not logged in" });
    await db.from('users').update({ loggedIn: 0 }).eq('"userID"', req.session.userId);
    req.session.destroy(() => res.json({ message: 'Logged out' }));
}

export const logoutUser = performLogout;
export const logoutWarehouse = performLogout;