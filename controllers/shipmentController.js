import db from '../db/db.js'
import axios from 'axios'

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
    status = status || "Pending";
    
    if (!product_name || !quantity || !source || !destination)
        return res.status(400).json({ error: "Please enter all details" });

    const { data: stockData } = await db.from('inventory').select('current_stock').eq('product_name', product_name).single();
    const { data: thresholdData } = await db.from('inventory').select('min_threshold').eq('product_name', product_name).single();
    if (!stockData || stockData.current_stock === undefined)
        return res.status(400).json({ error: "Product not found in inventory" });
    if (!thresholdData || thresholdData.min_threshold === undefined)
        return res.status(400).json({ error: "Inventory threshold not found for product" });
    if (quantity > stockData.current_stock)
        return res.status(400).json({ error: "Insufficient stock available" });

    await db.from('inventory')
        .update({ current_stock: stockData.current_stock - quantity })
        .eq('product_name', product_name);

    const newStock = stockData.current_stock - quantity;

    if (newStock <= thresholdData.min_threshold) {
    await db.from('inventory')
        .update({ restocking_needed: true })
        .eq('product_name', product_name);
    }

    try {
        
        const aiResponse = await axios.post('http://ai-service:8000/analyze', {
            product_name,
            quantity,
            source,
            destination,
            status: status || "Pending",
            // stock: stockData.current_stock,
            // Minimum_threshold: thresholdData.min_threshold
        });

        const riskValue = aiResponse.data.risk_level;
        const ai_action = aiResponse.data.ai_action;

        await db.from('shipments').insert({ 
            userID, 
            product_name, 
            quantity, 
            source, 
            destination, 
            status,
            risk: riskValue,
            ai_action
        });

        res.status(201).json({ 
            Success: `Shipment added with ${riskValue} risk level!`,
            Change_in_inventory: `Stock reduced from ${stockData.current_stock} to ${stockData.current_stock - quantity} for product ${product_name}`,
            analysis: aiResponse.data.reasoning,
            AI_Action: `Recommended action: ${ai_action}`
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ Error: "AI Service unreachable or DB error" });
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
        let { data: data_returned } = await db
        .from('shipments')
        .select('product_name', 'quantity', 'source', 'destination')
        .eq('id', id)
        .eq('"userID"', userID)
        .single();
            if (!data_returned || !data_returned.product_name)
                return res.status(400).json({ Error: "No such shipment id exists!" });

        const { data: stock } = await db.from('inventory').select('current_stock').eq('product_name', data_returned.product_name).single();
        const { data: minimum_threshold } = await db.from('inventory').select('min_threshold').eq('product_name', data_returned.product_name).single();
        if (!stock || stock.current_stock === undefined || !minimum_threshold || minimum_threshold.min_threshold === undefined)
            return res.status(400).json({ Error: "Inventory data not found for the product!" });

        const aiResponse = await axios.post('http://ai-service:8000/analyze', {
            product_name: data_returned.product_name,
            quantity: data_returned.quantity,
            source: data_returned.source,
            destination: data_returned.destination,
            status,
            // stock: stock.current_stock,
            // Minimum_threshold: minimum_threshold.min_threshold
        });

        const riskValue = aiResponse.data.risk_level;
        const ai_action = aiResponse.data.ai_action;
        const { data } = await db
            .from('shipments')
            .update({ status, risk: riskValue, ai_action })
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
                status: result.status,
                risk: result.risk,
                ai_action: result.ai_action 
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
            resultsJSON[result.id] = {
                userID: result.userID,
                product_name: result.product_name,
                quantity: result.quantity,
                source: result.source,
                destination: result.destination,
                status: result.status,
                risk: result.risk,
                ai_action: result.ai_action
            };
        });

        res.status(200).json(resultsJSON);
    } catch (err) {
        res.status(500).json({ Error: "Couldn't get the shipments!" });
    }
}

export async function updateInventory(req, res) {
    const userID = Number(req.params.userID);
    if (userID != req.session.userId)
        return res.status(401).json({ Error: "Please login first!" });

    const { data: user } = await db.from('users').select('role').eq('"userID"', userID).single();
    if (!user || user.role !== 'warehouse')
        return res.status(403).json({ Error: "Only warehouse accounts can update inventory" });

    let { product_name, quantity, min_threshold } = req.body;
    if (!product_name || !quantity || !min_threshold)
        return res.status(400).json({ error: "Please enter all the details to update inventory" });
    
    try {
        const { data } = await db
            .from('inventory')
            .select('*')
            .eq('product_name', product_name);  
        if (!data || data.length === 0){
            await db.from('inventory').insert({ product_name, current_stock: quantity, min_threshold, "warehouseID": userID, restocking_needed: false });
            return res.status(201).json({ Success: `Inventory added for product ${product_name}!` });
        }
        await db.from('inventory')
            .update({ current_stock: quantity, min_threshold })
            .eq('product_name', product_name);
        res.status(201).json({ Success: `Inventory updated for product ${product_name}!` });
    } catch (err) {
        res.status(500).json({ Error: "Couldn't update inventory for the product" });
    }
}