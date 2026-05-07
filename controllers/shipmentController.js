import db from '../db/db.js'

async function getUsername(userID) {
    const { data } = await db
        .from('users')
        .select('username')
        .eq('"userID"', userID)
        .single();
    return data?.username;
}

export async function postShipment(req, res) {
    const userID = Number(req.params.userID);
    if (userID != req.session.userId)
        return res.status(401).json({ Error: "Please login first!" });

    let { product_name, quantity, source, destination, status } = req.body;
    if (!product_name || !quantity || !source || !destination)
        return res.status(400).json({ error: "Please enter all the details of the shipment" });

    try {
        await db.from('shipments').insert({ userID, product_name, quantity, source, destination, status });
        res.status(201).json({ Success: `Shipment details for User ${await getUsername(userID)} added!` });
    } catch (err) {
        res.status(500).json({ Error: "Couldn't add shipment for the user" });
    }
}

export async function updateShipment(req, res) {
    const userID = Number(req.params.userID);
    if (userID != req.session.userId)
        return res.status(401).json({ Error: "Please login first!" });

    let { id, status } = req.body;
    if (!id || !status)
        return res.status(400).json({ error: "Please enter all the details to update shipment" });

    try {
        const { data } = await db
            .from('shipments')
            .update({ status })
            .eq('id', id)
            .eq('"userID"', userID)
            .select();

        if (!data || data.length === 0)
            return res.status(400).json({ Error: "No such shipment id exists!" });

        res.status(201).json({ Success: `Shipment details updated for User ${await getUsername(userID)}!` });
    } catch (err) {
        res.status(500).json({ Error: "Couldn't update shipment for the user" });
    }
}

export async function deleteShipment(req, res) {
    const userID = Number(req.params.userID);
    if (userID != req.session.userId)
        return res.status(401).json({ Error: "Please login first!" });

    let id = req.params.id;
    if (!id) return res.status(400).json({ error: "Please enter a shipment ID to delete!" });

    try {
        const { data } = await db
            .from('shipments')
            .delete()
            .eq('id', id)
            .eq('"userID"', userID)
            .select();

        if (!data || data.length === 0)
            return res.status(400).json({ Error: "No such shipment id exists, deletion unsuccessful!!" });

        res.status(201).json({ Success: `Shipment details deleted for User ${await getUsername(userID)}!` });
    } catch (err) {
        res.status(500).json({ Error: "Couldn't delete shipment for the user" });
    }
}

export async function getShipment(req, res) {
    const userID = Number(req.params.userID);
    if (userID != req.session.userId)
        return res.status(401).json({ Error: "Please login first!" });

    try {
        const { data: results } = await db
            .from('shipments')
            .select('*')
            .eq('"userID"', userID);

        if (!results || results.length === 0)
            return res.status(400).json({ Error: "No shipment initiated till now!" });

        let resultsJSON = {};
        results.forEach(result => {
            resultsJSON[result.id] = {
                product_name: result.product_name,
                quantity: result.quantity,
                source: result.source,
                destination: result.destination,
                status: result.status
            };
        });

        res.status(200).json(resultsJSON);
    } catch (err) {
        res.status(500).json({ Error: "Couldn't get the shipments for the user!" });
    }
}

export async function allShipments(req, res) {
    try {
        const { data: results } = await db.from('shipments').select('*');

        if (!results || results.length === 0)
            return res.status(401).json({ Error: "Database is empty! Useless website XD" });

        let resultsJSON = {};
        results.forEach(result => {
            resultsJSON[result.userID] = {
                id: result.id,
                product_name: result.product_name,
                quantity: result.quantity,
                source: result.source,
                destination: result.destination,
                status: result.status
            };
        });

        res.status(200).json(resultsJSON);
    } catch (err) {
        res.status(500).json({ Error: "Couldn't get the shipments!" });
    }
}