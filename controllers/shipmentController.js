import db from '../db/db.js';
import axios from 'axios';

// Haversine formula to compute geodesic distance in Kilometers
function calculateDistanceKm(coords1, coords2) {
    const [lat1, lon1] = coords1;
    const [lat2, lon2] = coords2;
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Find closest available transporter relative to the origin warehouse
async function findClosestTransporter(warehouseCoords) {
    const { data: transporters, error } = await db
        .from('users')
        .select('"userID", username, location_coords')
        .eq('role', 'transporter')
        .not('location_coords', 'is', null);

    if (error || !transporters || transporters.length === 0) return null;

    let closest = null;
    let minDistance = Infinity;

    for (const driver of transporters) {
        if (Array.isArray(driver.location_coords) && driver.location_coords.length === 2) {
            const dist = calculateDistanceKm(warehouseCoords, driver.location_coords);
            if (dist < minDistance) {
                minDistance = dist;
                closest = { ...driver, distanceKm: dist.toFixed(2) };
            }
        }
    }
    return closest;
}

async function getUserData(userID) {
    const { data, error } = await db
        .from('users')
        .select('username, location_coords, role')
        .eq("userID", userID)
        .single();
    if (error || !data) return null;
    return data;
}

// 1. POST SHIPMENT (ORDER PLACEMENT - Enforces Stock Check & Marks as Pending Approval)
export async function postShipment(req, res) {
    const userID = Number(req.params.userID);
    if (!req.session.userId || userID !== Number(req.session.userId)) {
        return res.status(401).json({ Error: "Unauthorized" });
    }

    let { product_name, quantity, warehouseID } = req.body;
    const reqQty = Number(quantity);

    if (!product_name || !reqQty || reqQty <= 0 || !warehouseID) {
        return res.status(400).json({ error: "Invalid product, quantity, or warehouse ID." });
    }

    try {
        const bizUser = await getUserData(userID);
        const whUser = await getUserData(warehouseID);
        if (!bizUser || !whUser) return res.status(404).json({ error: "Parties not found." });

        // STRICT VALIDATION: Check physical inventory
        const { data: inv, error: invErr } = await db.from('inventory')
            .select('*')
            .eq('product_name', product_name)
            .eq('warehouseID', warehouseID)
            .single();

        if (invErr || !inv) {
            return res.status(400).json({ error: "This product is not cataloged in the selected warehouse." });
        }

        if (inv.current_stock < reqQty) {
            return res.status(400).json({ 
                error: `Insufficient stock. Requested: ${reqQty}, Available: ${inv.current_stock}` 
            });
        }

        // Assign closest driver to warehouse
        const assignedDriver = await findClosestTransporter(whUser.location_coords);

        // AI Initial Route Scoring
        const aiResponse = await axios.post('http://ai-service:8000/analyze', {
            product_name, 
            quantity: reqQty, 
            source: whUser.username, 
            destination: bizUser.username,
            source_coords: whUser.location_coords, 
            dest_coords: bizUser.location_coords, 
            status: "Order Placed - Awaiting Warehouse Acceptance",
            userID: String(userID),
            metadata_env: {
                route_id: `CORRIDOR-${warehouseID}-${userID}`,
                road_condition: "Standard Transit Path",
                current_weather: "Clear"
            }
        });

        // Insert shipment with accepted_by_origin = FALSE
        const { data: insertedShipment, error: insertError } = await db.from('shipments').insert({
            userID: userID,
            sourceID: warehouseID,
            product_name,
            quantity: reqQty,
            source: whUser.username,
            destination: bizUser.username,
            source_coords: whUser.location_coords,
            dest_coords: bizUser.location_coords,
            status: 'Awaiting Warehouse Acceptance',
            risk: aiResponse.data.risk_level || 'Low',
            ai_action: aiResponse.data.ai_action || 'Pending Origin Hub Confirmation',
            displayToSource: true,
            displayToDest: true,
            transporter_id: assignedDriver ? assignedDriver.userID : null,
            transit_step: 0,
            accepted_by_origin: false,
            shipment_type: 'W2B'
        }).select().single();

        if (insertError) throw insertError;

        res.status(201).json({ 
            Success: "Order registered. Notification dispatched to Origin Warehouse for confirmation.",
            shipmentID: insertedShipment.id,
            assigned_driver: assignedDriver ? assignedDriver.username : "Auto-Assignment Pending"
        });

    } catch (err) {
        console.error("Order submission failure:", err);
        res.status(500).json({ Error: "Order placement failed: " + err.message });
    }
}

// 2. ACCEPT / DISPATCH SHIPMENT (Warehouse Confirms Order -> Stock is Deducted & Transit Begins)
// 1. ACCEPT / DISPATCH SHIPMENT
// 2. ACCEPT / DISPATCH SHIPMENT
export async function acceptShipmentOrder(req, res) {
    const sessionUserId = req.session?.userId;
    const warehouseID = Number(sessionUserId || req.params.userID);

    if (!sessionUserId) {
        return res.status(401).json({ error: "Unauthorized: Active session not found. Please log in." });
    }

    const { shipmentID } = req.body;

    try {
        const { data: shipment, error: sErr } = await db.from('shipments')
            .select('*')
            .eq('id', Number(shipmentID))
            .single();

        if (sErr || !shipment) {
            return res.status(404).json({ error: "Shipment record not found." });
        }

        // Verify that the currently logged-in warehouse is indeed the source
        if (Number(shipment.sourceID) !== Number(warehouseID)) {
            return res.status(403).json({ error: `Only the origin hub (Hub #${shipment.sourceID}) can accept this order.` });
        }

        if (shipment.accepted_by_origin) {
            return res.status(400).json({ error: "Shipment is already accepted and in transit." });
        }

        const { data: inv, error: invErr } = await db.from('inventory')
            .select('*')
            .eq('product_name', shipment.product_name)
            .eq('warehouseID', warehouseID)
            .single();

        if (invErr || !inv || inv.current_stock < shipment.quantity) {
            return res.status(400).json({ 
                error: `Insufficient stock in Warehouse #${warehouseID}. Available: ${inv ? inv.current_stock : 0}` 
            });
        }

        // Deduct physical inventory
        const newStock = inv.current_stock - shipment.quantity;
        await db.from('inventory').update({
            current_stock: newStock,
            restocking_needed: newStock <= inv.min_threshold
        }).eq('id', inv.id);

        // Advance transit state
        await db.from('shipments').update({
            accepted_by_origin: true,
            status: 'Dispatched - In Transit (Checkpoint 1/10)',
            transit_step: 1
        }).eq('id', Number(shipmentID));

        return res.status(200).json({ Success: "Order accepted. Cargo dispatched to assigned transporter." });
    } catch (err) {
        console.error("Acceptance failure:", err);
        return res.status(500).json({ error: "Failed to process acceptance: " + err.message });
    }
}

// 3. CONFIRM W2W REBALANCE
export async function confirmW2WTransfer(req, res) {
    const sessionUserId = req.session?.userId;
    const sourceWarehouseID = Number(sessionUserId || req.params.userID);

    if (!sessionUserId) {
        return res.status(401).json({ error: "Unauthorized: Active session not found. Please log in." });
    }

    const { shipmentID } = req.body;

    try {
        const { data: shipment, error: sErr } = await db.from('shipments')
            .select('*')
            .eq('id', Number(shipmentID))
            .single();

        if (sErr || !shipment) {
            return res.status(404).json({ error: "W2W proposal record not found." });
        }

        if (Number(shipment.sourceID) !== Number(sourceWarehouseID)) {
            return res.status(403).json({ error: "Only the designated surplus hub can confirm this transfer." });
        }

        const { data: sourceInv } = await db.from('inventory')
            .select('*')
            .eq('warehouseID', sourceWarehouseID)
            .eq('product_name', shipment.product_name)
            .single();

        if (!sourceInv || sourceInv.current_stock < shipment.quantity) {
            return res.status(400).json({ error: "Surplus stock no longer available." });
        }

        // Deduct from surplus warehouse
        await db.from('inventory')
            .update({ current_stock: sourceInv.current_stock - shipment.quantity })
            .eq('id', sourceInv.id);

        await db.from('shipments').update({
            accepted_by_origin: true,
            is_w2w_confirmed: true,
            status: 'In Transit (W2W Rebalance)',
            transit_step: 1
        }).eq('id', Number(shipmentID));

        return res.status(200).json({ Success: "W2W rebalance confirmed. Stock dispatched." });
    } catch (err) {
        return res.status(500).json({ error: "W2W confirmation failed: " + err.message });
    }
}

// 4. TRANSPORTER STEPWISE TELEMETRY UPDATE (1/10 ... 10/10)
export async function updateTransitStep(req, res) {
    const transporterID = Number(req.params.transporterID);
    const { shipmentID, step, hazard_report } = req.body;

    if (!req.session.userId || transporterID !== Number(req.session.userId)) {
        return res.status(401).json({ Error: "Unauthorized" });
    }

    const stepNum = Number(step);
    if (isNaN(stepNum) || stepNum < 1 || stepNum > 10) {
        return res.status(400).json({ error: "Transit step must be an integer between 1 and 10." });
    }

    try {
        const { data: shipment } = await db.from('shipments')
            .select('*')
            .eq('id', shipmentID)
            .eq('transporter_id', transporterID)
            .single();

        if (!shipment) return res.status(404).json({ error: "Assigned shipment not found." });

        let statusText = `In Transit (Checkpoint ${stepNum}/10)`;
        let riskScore = shipment.risk;
        let aiAction = shipment.ai_action;

        // If at 10/10, complete delivery and credit destination inventory
        if (stepNum === 10) {
            statusText = "Delivered";

            // If W2W, increment destination hub stock
            if (shipment.shipment_type === 'W2W') {
                const { data: destInv } = await db.from('inventory')
                    .select('*')
                    .eq('warehouseID', shipment.userID)
                    .eq('product_name', shipment.product_name)
                    .single();

                if (destInv) {
                    await db.from('inventory').update({
                        current_stock: destInv.current_stock + shipment.quantity,
                        restocking_needed: false
                    }).eq('id', destInv.id);
                }
            }
        } else if (hazard_report) {
            // Re-evaluate hazard through AI Agent
            const aiRecheck = await axios.post('http://ai-service:8000/analyze', {
                product_name: shipment.product_name,
                quantity: shipment.quantity,
                source: shipment.source,
                destination: shipment.destination,
                source_coords: shipment.source_coords,
                dest_coords: shipment.dest_coords,
                status: `Driver Flagged: ${hazard_report} at Checkpoint ${stepNum}/10`,
                userID: String(shipment.userID),
                metadata_env: {
                    route_id: `CORRIDOR-${shipment.sourceID}-${shipment.userID}`,
                    road_condition: hazard_report,
                    current_weather: "Dynamic Incident Reported"
                }
            });
            riskScore = aiRecheck.data.risk_level;
            aiAction = aiRecheck.data.ai_action;
        }

        await db.from('shipments').update({
            transit_step: stepNum,
            status: statusText,
            risk: riskScore,
            ai_action: aiAction
        }).eq('id', shipmentID);

        res.status(200).json({ 
            Success: `Progress logged: Checkpoint ${stepNum}/10`,
            status: statusText,
            risk: riskScore 
        });

    } catch (err) {
        res.status(500).json({ error: "Failed to update step: " + err.message });
    }
}

// 5. GET SHIPMENTS FOR TRANSPORTER
export async function getTransporterShipments(req, res) {
    const transporterID = Number(req.params.transporterID);
    if (!req.session.userId || transporterID !== Number(req.session.userId)) {
        return res.status(401).json({ Error: "Unauthorized" });
    }

    try {
        const { data, error } = await db.from('shipments')
            .select('*')
            .eq('transporter_id', transporterID)
            .order('id', { ascending: false });

        if (error) throw error;
        res.status(200).json(data || []);
    } catch (err) {
        res.status(500).json({ error: "Could not fetch assigned cargo runs." });
    }
}

// 6. GET ALL SHIPMENTS & INVENTORY MATRIX
export async function getGlobalInventoryMatrix(req, res) {
    try {
        const { data: warehouses } = await db.from('users').select('userID, username').eq('role', 'warehouse');
        const { data: inventory } = await db.from('inventory').select('*');
        res.status(200).json({ warehouses: warehouses || [], inventory: inventory || [] });
    } catch (err) {
        res.status(500).json({ Error: "Matrix link decoupled." });
    }
}

export async function allShipments(req, res) {
    try {
        const { data } = await db.from('shipments').select('*');
        res.status(200).json(data || []);
    } catch (err) {
        res.status(500).json({ Error: "Fetch failed." });
    }
}

export async function getShipment(req, res) {
    const userID = Number(req.params.userID);
    try {
        const { data } = await db.from('shipments')
            .select('*')
            .or(`and(sourceID.eq.${userID},displayToSource.eq.true),and(userID.eq.${userID},displayToDest.eq.true)`);
        
        const results = (data || []).reduce((acc, item) => {
            acc[item.id] = item;
            return acc;
        }, {});
        res.status(200).json(results);
    } catch (err) {
        res.status(500).json({ Error: "Feed retrieval error." });
    }
}

export async function getInventory(req, res) {
    const warehouseID = Number(req.params.userID);
    try {
        const { data } = await db.from('inventory').select('*').eq('warehouseID', warehouseID);
        res.status(200).json(data || []);
    } catch (err) {
        res.status(500).json({ Error: "Inventory fetch failed." });
    }
}

export async function updateInventory(req, res) {
    const userID = Number(req.params.userID);
    let { product_name, quantity, min_threshold, category } = req.body;
    try {
        const { data: existing } = await db.from('inventory')
            .select('*')
            .eq('product_name', product_name)
            .eq('warehouseID', userID)
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
        } else {
            const totalStock = existing.current_stock + Number(quantity);
            await db.from('inventory').update({
                current_stock: totalStock,
                min_threshold: Number(min_threshold) || existing.min_threshold,
                restocking_needed: totalStock <= (Number(min_threshold) || existing.min_threshold)
            }).eq('id', existing.id);
        }
        res.status(200).json({ Success: "Inventory updated." });
    } catch (err) {
        res.status(500).json({ Error: "Inventory augmentation failure." });
    }
}

export async function updateShipment(req, res) {
    const { id, status } = req.body;
    try {
        await db.from('shipments').update({ status }).eq('id', id);
        res.status(200).json({ Success: "Status updated." });
    } catch (err) {
        res.status(500).json({ Error: "Update failed." });
    }
}

export async function clearShipment(req, res) {
    const userID = Number(req.params.userID);
    const { id } = req.params;
    try {
        const { data: shipment } = await db.from('shipments').select('*').eq('id', id).single();
        if (!shipment) return res.status(404).json({ Error: "Not found." });

        let updateData = {};
        if (shipment.sourceID === userID) updateData = { displayToSource: false };
        else if (shipment.userID === userID) updateData = { displayToDest: false };
        
        await db.from('shipments').update(updateData).eq('id', id);
        res.status(200).json({ Success: "Cleared." });
    } catch (err) {
        res.status(500).json({ Error: "Failed to clear." });
    }
}