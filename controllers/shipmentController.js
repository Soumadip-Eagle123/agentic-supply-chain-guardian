import db from '../db/db.js';
import axios from 'axios';

async function getUserData(userID) {
    const { data, error } = await db
        .from('users')
        .select('username, location_coords, role')
        .eq("userID", userID)
        .single();
    if (error || !data) return null;
    return data;
}

async function executeW2WTransfer(plan) {
    const { source_id, dest_id, qty, product_name } = plan;

    try {
        const sourceWH = await getUserData(source_id);
        const destWH = await getUserData(dest_id);

        if (!sourceWH || !destWH) throw new Error("Agent source/dest nodes unreachable.");

        const { data: sourceInv } = await db.from('inventory').select('current_stock').eq('warehouseID', source_id).eq('product_name', product_name).single();
        const { data: destInv } = await db.from('inventory').select('current_stock').eq('warehouseID', dest_id).eq('product_name', product_name).single();

        await db.from('inventory')
            .update({ current_stock: sourceInv.current_stock - qty })
            .eq('warehouseID', source_id)
            .eq('product_name', product_name);

        await db.from('inventory')
            .update({ 
                current_stock: destInv.current_stock + qty,
                restocking_needed: false 
            })
            .eq('warehouseID', dest_id)
            .eq('product_name', product_name);

        await db.from('shipments').insert({
            sourceID: source_id,
            "userID": dest_id,
            product_name,
            quantity: qty,
            source: sourceWH.username,
            destination: destWH.username,
            source_coords: sourceWH.location_coords,
            dest_coords: destWH.location_coords,
            shipment_type: 'W2W',
            status: 'AI Rebalancing',
            risk: 'Low',
            ai_action: `Autonomous Rebalance: Llama 3 moving ${qty} units from ${sourceWH.username} to Hub ${destWH.username}.`,
            displayToSource: true,
            displayToDest: true
        });

        console.log(`[AGENT SUCCESS] Neural Grid Stabilized. ${qty} units of ${product_name} in transit.`);
    } catch (err) {
        console.error("[AGENT FAILURE] Executor Error:", err.message);
    }
}

export async function postShipment(req, res) {
    const userID = Number(req.params.userID);
    if (!req.session.userId || userID !== Number(req.session.userId)) {
        return res.status(401).json({ Error: "Unauthorized" });
    }

    let { product_name, quantity, warehouseID, status } = req.body;
    status = status || "In Transit";

    try {
        const bizUser = await getUserData(userID);
        const whUser = await getUserData(warehouseID);
        if (!bizUser || !whUser) return res.status(404).json({ error: "Party not found." });

        const { data: inv } = await db.from('inventory')
            .select('*').eq('product_name', product_name).eq('warehouseID', warehouseID).single();

        if (!inv || inv.current_stock < quantity) return res.status(400).json({ error: "Stock unavailable." });

        const aiResponse = await axios.post('http://ai-service:8000/analyze', {
            product_name, quantity, source: whUser.username, destination: bizUser.username,
            source_coords: whUser.location_coords, dest_coords: bizUser.location_coords, status, 
            userID: String(userID),

            metadata_env: {
              route_id: "ROUTE-NORTH-04",
              road_condition: "Severe Unpaved Potholes",
              current_weather: "Heavy Monsoon Rain"
            }
        }).catch(() => ({ data: { risk_level: "Low", ai_action: "No Action", reasoning: "AI Service Connection timeout." }}));

        const newStock = inv.current_stock - quantity;
        await db.from('inventory').update({ 
            current_stock: newStock, 
            restocking_needed: newStock <= inv.min_threshold 
        }).eq('id', inv.id);

        await db.from('shipments').insert({
            "userID": userID, sourceID: warehouseID,
            product_name, quantity, source: whUser.username, destination: bizUser.username,
            source_coords: whUser.location_coords, dest_coords: bizUser.location_coords,
            status, risk: aiResponse.data.risk_level, ai_action: aiResponse.data.ai_action,
            displayToSource: true, displayToDest: true
        });

        if (newStock <= inv.min_threshold) {
            console.log(`[REBALANCE] Hub ${warehouseID} critical. Assembling recovery context...`);

            try {
                const { data: invItems, error: invError } = await db
                    .from('inventory')
                    .select('warehouseID, current_stock, min_threshold')
                    .eq('product_name', product_name)
                    .not('warehouseID', 'is', null);

                if (invError) throw invError;

                const warehouseIDs = invItems.map(i => i.warehouseID);
                
                const { data: userDetails, error: userError } = await db
                    .from('users')
                    .select('userID, username, location_coords')
                    .in('userID', warehouseIDs)
                    .not('location_coords', 'is', null); 

                if (userError) throw userError;

                const cleanContext = invItems
                    .map(item => {
                        const detail = userDetails.find(u => u.userID === item.warehouseID);
                        if (!detail) return null; 
                        return {
                            warehouse_id: item.warehouseID,
                            stock: item.current_stock,
                            threshold: item.min_threshold,
                            name: detail.username,
                            coords: detail.location_coords
                        };
                    })
                    .filter(Boolean); 

                if (cleanContext.length > 0) {
                    console.log("[AI-LINK] Sending sanitized context to Llama 3...");

                    const agentRes = await axios.post('http://ai-service:8000/rebalance', {
                        product_name,
                        deficit_warehouse_id: warehouseID,
                        inventory_context: cleanContext,
                        constant_restock_qty: inv.min_threshold * 2
                    });

                    const decision = agentRes.data;
                    console.log("[AI-DECISION] Status:", decision.status);

                    if (decision.status === 'EXECUTE' && decision.source_id) {
                        console.log(`[AGENT] Directive: Move ${decision.qty} from Hub ${decision.source_id}`);
                        await executeW2WTransfer({
                            source_id: Number(decision.source_id),
                            dest_id: warehouseID,
                            qty: decision.qty,
                            product_name: product_name
                        });
                    }
                } else {
                    console.log("[AGENT] No viable surplus hubs with valid coordinates found.");
                }
            } catch (err) {
                console.error("[REBALANCE-CRASH] Trace:", err.message);
            }
        }

        res.status(201).json({ Success: "Shipment Dispatched" });

    } catch (err) {
        console.error("CRITICAL_ERR:", err);
        res.status(500).json({ Error: "Dispatch failed" });
    }
}

export async function clearShipment(req, res) {
    const userID = Number(req.params.userID);
    if (userID !== req.session.userId)
        return res.status(401).json({ Error: "Unauthorized" });

    const { id } = req.params;

    try {
        const { data: shipment, error: fetchError } = await db
            .from('shipments')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !shipment) return res.status(404).json({ Error: "Shipment record not found." });

        let updateData = {};
        if (shipment.sourceID === userID) updateData = { displayToSource: false };
        else if (shipment.userID === userID) updateData = { displayToDest: false };
        else return res.status(403).json({ Error: "You do not have permission to clear this shipment." });

        const { error: updateError } = await db.from('shipments').update(updateData).eq('id', id);
        if (updateError) throw updateError;

        res.status(200).json({ Success: "Shipment cleared from your view." });
    } catch (err) {
        res.status(500).json({ Error: "Failed to clear shipment." });
    }
}

export async function getShipment(req, res) {
    const userID = Number(req.params.userID);
    if (userID !== req.session.userId)
        return res.status(401).json({ Error: "Unauthorized access" });

    try {
        const { data: results, error } = await db
            .from('shipments')
            .select('*')
            .or(`and(sourceID.eq.${userID},displayToSource.eq.true),and(userID.eq.${userID},displayToDest.eq.true)`);

        if (error) throw error;
        if (!results || results.length === 0) return res.status(200).json({});

        const resultsJSON = results.reduce((acc, item) => {
            acc[item.id] = item;
            return acc;
        }, {});

        res.status(200).json(resultsJSON);
    } catch (err) {
        res.status(500).json({ Error: "Could not retrieve shipment feed." });
    }
}


export async function getInventory(req, res) {
    const warehouseID = Number(req.params.userID);
    

    if (!req.session?.userId || Number(warehouseID) !== Number(req.session.userId)) {
        return res.status(401).json({ 
            Error: "Unauthorized",
            debug: { param: warehouseID, session: req.session?.userId } 
        });
    }

    try {
        const { data, error } = await db
            .from('inventory')
            .select('*')
            .eq('warehouseID', warehouseID); // Usually no double quotes needed here

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({ Error: "Failed to fetch stock." });
    }
}


export async function updateInventory(req, res) {
    const userID = Number(req.params.userID);
    if (userID !== req.session.userId) 
        return res.status(401).json({ Error: "Unauthorized" });

    let { product_name, quantity, min_threshold, category } = req.body; 
    
    if (!product_name || quantity === undefined)
        return res.status(400).json({ error: "Product name and quantity are required." });

    try {
        const { data: existing } = await db
            .from('inventory')
            .select('*')
            .eq('product_name', product_name)
            .eq('"warehouseID"', userID)
            .single();

        if (!existing) {
            await db.from('inventory').insert({
                product_name,
                category: category || 'General',
                current_stock: Number(quantity),
                min_threshold: Number(min_threshold) || 10,
                warehouseID: userID,
                restocking_needed: Number(quantity) <= (Number(min_threshold) || 10)
            });
            return res.status(201).json({ Success: `New product ${product_name} registered in ${category}.` });
        }

        const totalStock = existing.current_stock + Number(quantity);
        const newThreshold = Number(min_threshold) || existing.min_threshold;
        const newCategory = category || existing.category;

        await db.from('inventory')
            .update({
                current_stock: totalStock,
                min_threshold: newThreshold,
                category: newCategory,
                restocking_needed: totalStock <= newThreshold
            })
            .eq('id', existing.id);

        res.status(200).json({ Success: `Batch added to ${product_name}. New total: ${totalStock}` });
    } catch (err) {
        res.status(500).json({ Error: "Database error during inventory augmentation." });
    }
}

export async function deleteShipment(req, res) {
    res.status(405).json({ Error: "Use clearShipment (Soft Delete) endpoint instead." });
}

export async function updateShipment(req, res) {
    const userID = Number(req.params.userID);
    if (userID !== req.session.userId)
        return res.status(401).json({ Error: "Unauthorized" });

    const { id, status } = req.body;
    if (!id || !status)
        return res.status(400).json({ error: "Shipment ID and status required." });

    try {
        const { error } = await db
            .from('shipments')
            .update({ status })
            .eq('id', id);

        if (error) throw error;
        res.status(200).json({ Success: "Status updated." });
    } catch (err) {
        res.status(500).json({ Error: "Failed to update shipment status." });
    }
}

export async function allShipments(req, res) {
    try {
        const { data, error } = await db
            .from('shipments')
            .select('*');

        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({});

        const resultsJSON = data.reduce((acc, item) => {
            acc[item.id] = item;
            return acc;
        }, {});

        res.status(200).json(resultsJSON);
    } catch (err) {
        res.status(500).json({ Error: "Could not retrieve all shipments." });
    }
}

export async function getGlobalInventoryMatrix(req, res) {
    try {
        const { data: warehouses, error: whError } = await db
            .from('users')
            .select('userID, username')
            .eq('role', 'warehouse');

        if (whError || !warehouses) {
            return res.status(500).json({ Error: "Could not sync active warehouse node maps." });
        }
        const { data: stockItems, error: invError } = await db
            .from('inventory')
            .select('*');

        if (invError) return res.status(500).json({ Error: "Failed to harvest core ledger parameters." });

        const cleanMatrix = stockItems.map(item => {
            const matchingWH = warehouses.find(w => Number(w.userID) === Number(item.warehouseID));
            return {
                ...item,
                warehouse_name: matchingWH ? matchingWH.username : `Node Cluster #${item.warehouseID}`
            };
        });
        res.status(200).json({
            warehouses: warehouses, // Sends the complete list to build your dynamic dropdown menu
            inventory: cleanMatrix
        });

    } catch (err) {
        console.error("Global matrix extraction failure:", err);
        res.status(500).json({ Error: "Internal server telemetry link decoupled." });
    }
}