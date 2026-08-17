import db from '../db/db.js';
import axios from 'axios';

// Haversine formula to compute geodesic distance in Kilometers
function calculateDistanceKm(coords1, coords2) {
    if (!Array.isArray(coords1) || !Array.isArray(coords2) || coords1.length < 2 || coords2.length < 2) {
        return Infinity;
    }
    const [lat1, lon1] = coords1.map(Number);
    const [lat2, lon2] = coords2.map(Number);
    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return Infinity;

    const R = 6371;
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
    try {
        const { data: transporters, error } = await db
            .from('users')
            .select('userID, username, location_coords')
            .eq('role', 'transporter');

        if (error || !transporters || transporters.length === 0) {
            console.warn("[TRANSPORTER MATCH]: No registered transporters found.");
            return null;
        }

        let closest = null;
        let minDistance = Infinity;

        if (Array.isArray(warehouseCoords) && warehouseCoords.length === 2) {
            for (const driver of transporters) {
                if (Array.isArray(driver.location_coords) && driver.location_coords.length === 2) {
                    const dist = calculateDistanceKm(warehouseCoords, driver.location_coords);
                    if (dist < minDistance) {
                        minDistance = dist;
                        closest = { ...driver, distanceKm: dist.toFixed(2) };
                    }
                }
            }
        }

        if (!closest && transporters.length > 0) {
            closest = transporters[0];
            console.log(`[TRANSPORTER MATCH]: Defaulting to driver ${closest.username} (ID: ${closest.userID})`);
        }

        return closest;
    } catch (e) {
        console.error("[TRANSPORTER MATCH EXCEPTION]:", e.message);
        return null;
    }
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

// 1. ORDER PLACEMENT (B2W / W2B Request)
export async function postShipment(req, res) {
    const sessionUserId = req.session?.userId;
    const userID = Number(req.params.userID || sessionUserId);

    if (!sessionUserId || userID !== Number(sessionUserId)) {
        return res.status(401).json({ Error: "Unauthorized: Session expired or invalid." });
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

        const assignedDriver = await findClosestTransporter(whUser.location_coords);

        let aiRisk = 'Low';
        let aiAction = 'Pending Origin Hub Confirmation';

        try {
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
            if (aiResponse?.data) {
                aiRisk = aiResponse.data.risk_level || 'Low';
                aiAction = aiResponse.data.ai_action || aiAction;
            }
        } catch (aiErr) {
            console.warn("[AI SERVICE WARNING]: Falling back to baseline risk scoring.");
        }

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
            risk: aiRisk,
            ai_action: aiAction,
            displayToSource: true,
            displayToDest: true,
            displaytotransporter: true,
            transporter_id: assignedDriver ? assignedDriver.userID : null,
            transit_step: 0,
            is_picked_up: false,
            accepted_by_origin: false,
            shipment_type: 'W2B'
        }).select().single();

        if (insertError) throw insertError;

        return res.status(201).json({
            Success: "Order registered. Notification dispatched to Origin Warehouse for confirmation.",
            shipmentID: insertedShipment.id,
            assigned_driver: assignedDriver ? assignedDriver.username : "Auto-Assignment Pending"
        });

    } catch (err) {
        console.error("Order submission failure:", err);
        return res.status(500).json({ Error: "Order placement failed: " + err.message });
    }
}

// 2. ACCEPT / DISPATCH SHIPMENT
export async function acceptShipmentOrder(req, res) {
    const sessionUserId = req.session?.userId;
    const warehouseID = Number(sessionUserId || req.params.userID);

    if (!sessionUserId) {
        return res.status(401).json({ error: "Unauthorized: Active session not found." });
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

        const newStock = inv.current_stock - shipment.quantity;
        const needsRestock = newStock <= inv.min_threshold;

        await db.from('inventory').update({
            current_stock: newStock,
            restocking_needed: needsRestock
        }).eq('id', inv.id);

        await db.from('shipments').update({
            accepted_by_origin: true,
            status: 'Dispatched - Awaiting Driver Collection',
            transit_step: 0,
            is_picked_up: false
        }).eq('id', Number(shipmentID));

        // AUTONOMOUS W2W REBALANCING TRIGGER
        if (needsRestock) {
            console.log(`[REBALANCE] Hub ${warehouseID} threshold breached for ${shipment.product_name}. Querying surplus nodes...`);
            try {
                const { data: invItems, error: invQueryErr } = await db.from('inventory')
                    .select('warehouseID, current_stock, min_threshold')
                    .eq('product_name', shipment.product_name)
                    .neq('warehouseID', warehouseID)
                    .not('warehouseID', 'is', null);

                if (!invQueryErr && invItems && invItems.length > 0) {
                    const warehouseIDs = invItems.map(i => i.warehouseID);
                    const { data: userDetails } = await db.from('users')
                        .select('userID, username, location_coords')
                        .in('userID', warehouseIDs);

                    const cleanContext = invItems.map(item => {
                        const detail = userDetails?.find(u => u.userID === item.warehouseID);
                        if (!detail) return null;
                        return {
                            warehouse_id: item.warehouseID,
                            stock: item.current_stock,
                            threshold: item.min_threshold,
                            name: detail.username,
                            coords: detail.location_coords
                        };
                    }).filter(Boolean);

                    if (cleanContext.length > 0) {
                        const agentRes = await axios.post('http://ai-service:8000/rebalance', {
                            product_name: shipment.product_name,
                            deficit_warehouse_id: warehouseID,
                            inventory_context: cleanContext,
                            constant_restock_qty: inv.min_threshold * 2
                        });

                        const decision = agentRes?.data;
                        if (decision?.status === 'EXECUTE' && decision?.source_id) {
                            const sourceWH = await getUserData(decision.source_id);
                            const destWH = await getUserData(warehouseID);

                            await db.from('shipments').insert({
                                sourceID: decision.source_id,
                                userID: warehouseID,
                                product_name: shipment.product_name,
                                quantity: decision.qty,
                                source: sourceWH?.username || `Hub #${decision.source_id}`,
                                destination: destWH?.username || `Hub #${warehouseID}`,
                                source_coords: sourceWH?.location_coords,
                                dest_coords: destWH?.location_coords,
                                shipment_type: 'W2W',
                                status: 'AI Rebalance Proposed - Awaiting Surplus Hub Approval',
                                risk: 'Low',
                                ai_action: `Autonomous Rebalance: Requesting ${decision.qty} units from ${sourceWH?.username}.`,
                                displayToSource: true,
                                displayToDest: true,
                                displaytotransporter: true,
                                accepted_by_origin: false,
                                is_w2w_confirmed: false,
                                transit_step: 0
                            });
                        }
                    }
                }
            } catch (rebErr) {
                console.error("[REBALANCE FAULT]:", rebErr.message);
            }
        }

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
        return res.status(401).json({ error: "Unauthorized: Active session not found." });
    }

    const { shipmentID } = req.body;

    try {
        const { data: shipment, error: sErr } = await db.from('shipments')
            .select('*')
            .eq('id', Number(shipmentID))
            .eq('shipment_type', 'W2W')
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

        const newStock = sourceInv.current_stock - shipment.quantity;
        await db.from('inventory')
            .update({ 
                current_stock: newStock,
                restocking_needed: newStock <= sourceInv.min_threshold
            })
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

// 4. CONFIRM PICKUP
export async function confirmPickup(req, res) {
    const sessionUserId = req.session?.userId;
    const transporterID = Number(sessionUserId || req.params.transporterID);
    const { shipmentID } = req.body;

    if (!sessionUserId) {
        return res.status(401).json({ error: "Unauthorized: Active driver session not found." });
    }

    try {
        const { data: shipment, error: sErr } = await db.from('shipments')
            .select('*')
            .eq('id', Number(shipmentID))
            .single();

        if (sErr || !shipment) {
            return res.status(404).json({ error: "Assigned cargo run not found." });
        }

        if (!shipment.transporter_id || Number(shipment.transporter_id) !== transporterID) {
            return res.status(403).json({ error: "This run is assigned to another transporter or unassigned." });
        }

        await db.from('shipments').update({
            is_picked_up: true,
            status: 'Cargo Picked Up — En Route',
            transit_step: 0
        }).eq('id', Number(shipmentID));

        return res.status(200).json({ Success: "Cargo collection confirmed. Active delivery begun." });
    } catch (err) {
        return res.status(500).json({ error: "Failed to confirm pickup: " + err.message });
    }
}

// 5. UPDATE TRANSIT STEP
export async function updateTransitStep(req, res) {
    const sessionUserId = req.session?.userId;
    const transporterID = Number(sessionUserId || req.params.transporterID);
    const { shipmentID, step, hazard_report } = req.body;

    if (!sessionUserId) {
        return res.status(401).json({ Error: "Unauthorized: Active driver session not found." });
    }

    const stepNum = Number(step);
    if (isNaN(stepNum) || stepNum < 0 || stepNum > 10) {
        return res.status(400).json({ error: "Transit step must be an integer between 0 and 10." });
    }

    try {
        const { data: shipment } = await db.from('shipments')
            .select('*')
            .eq('id', shipmentID)
            .single();

        if (!shipment) return res.status(404).json({ error: "Assigned shipment not found." });

        if (!shipment.transporter_id || Number(shipment.transporter_id) !== transporterID) {
            return res.status(403).json({ error: "Unauthorized access to this manifest." });
        }

        let statusText = stepNum === 10 ? 'Arrived at Destination — Awaiting Final Handover' : (stepNum === 0 ? 'Cargo Picked Up — En Route' : `In Transit (Checkpoint ${stepNum}/10)`);
        let riskScore = shipment.risk;
        let aiAction = shipment.ai_action;

        if (hazard_report) {
            try {
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
                if (aiRecheck?.data) {
                    riskScore = aiRecheck.data.risk_level || riskScore;
                    aiAction = aiRecheck.data.ai_action || aiAction;
                }
            } catch (aiErr) {
                riskScore = "High";
                aiAction = `HAZARD ALERT: ${hazard_report}. Proceed with caution.`;
            }
        }

        await db.from('shipments').update({
            transit_step: stepNum,
            status: statusText,
            risk: riskScore,
            ai_action: aiAction
        }).eq('id', shipmentID);

        return res.status(200).json({
            Success: `Progress logged: Checkpoint ${stepNum}/10`,
            status: statusText,
            risk: riskScore,
            transit_step: stepNum
        });

    } catch (err) {
        return res.status(500).json({ error: "Failed to update step: " + err.message });
    }
}

// 6. GET TRANSPORTER SHIPMENTS
export async function getTransporterShipments(req, res) {
    const sessionUserId = req.session?.userId;
    const transporterID = Number(sessionUserId || req.params.transporterID);

    if (!sessionUserId || transporterID !== Number(sessionUserId)) {
        return res.status(401).json({ error: "Unauthorized: Session mismatch." });
    }

    try {
        const { data: driverData } = await db.from('users')
            .select('username, location_coords')
            .eq('userID', transporterID)
            .single();

        const { data, error } = await db.from('shipments')
            .select('*')
            .eq('transporter_id', transporterID)
            .eq('displaytotransporter', true)
            .or('accepted_by_origin.eq.true,is_w2w_confirmed.eq.true')
            .order('id', { ascending: false });

        if (error) throw error;

        return res.status(200).json({
            driver_base: driverData?.location_coords || null,
            runs: data || []
        });
    } catch (err) {
        return res.status(500).json({ error: "Could not fetch assigned shipments: " + err.message });
    }
}

// 7. WAREHOUSE REJECT / CANCEL SHIPMENT
export async function cancelWarehouseShipment(req, res) {
    const sessionUserId = req.session?.userId;
    const warehouseID = Number(sessionUserId || req.params.userID);
    const { shipmentID, reason } = req.body;

    if (!sessionUserId) {
        return res.status(401).json({ error: "Unauthorized: Active session not found." });
    }

    try {
        const { data: shipment, error: sErr } = await db.from('shipments')
            .select('*')
            .eq('id', Number(shipmentID))
            .single();

        if (sErr || !shipment) {
            return res.status(404).json({ error: "Shipment record not found." });
        }

        if (Number(shipment.sourceID) !== warehouseID) {
            return res.status(403).json({ error: "Only the origin warehouse can cancel this order." });
        }

        if (shipment.status === 'Delivered') {
            return res.status(400).json({ error: "Cannot cancel a delivered shipment." });
        }

        if (shipment.accepted_by_origin) {
            const { data: inv } = await db.from('inventory')
                .select('*')
                .eq('warehouseID', warehouseID)
                .eq('product_name', shipment.product_name)
                .single();

            if (inv) {
                const restoredStock = inv.current_stock + shipment.quantity;
                await db.from('inventory').update({
                    current_stock: restoredStock,
                    restocking_needed: restoredStock <= inv.min_threshold
                }).eq('id', inv.id);
            }
        }

        const rejectionNote = reason ? `Rejected by Warehouse: ${reason}` : "Cancelled by Origin Warehouse";

        await db.from('shipments').update({
            status: 'Cancelled by Warehouse',
            risk: 'High',
            ai_action: rejectionNote,
            transit_step: 0
        }).eq('id', Number(shipmentID));

        return res.status(200).json({ Success: "Shipment cancelled. Stock rolled back if previously reserved." });
    } catch (err) {
        return res.status(500).json({ error: "Failed to cancel shipment: " + err.message });
    }
}

// 8. TRANSPORTER EMERGENCY INCIDENT / ABORT
export async function cancelTransporterShipment(req, res) {
    const sessionUserId = req.session?.userId;
    const transporterID = Number(sessionUserId || req.params.transporterID);
    const { shipmentID, incident_reason } = req.body;

    if (!sessionUserId) {
        return res.status(401).json({ error: "Unauthorized: Driver session mismatch." });
    }

    try {
        const { data: shipment, error: sErr } = await db.from('shipments')
            .select('*')
            .eq('id', Number(shipmentID))
            .single();

        if (sErr || !shipment) {
            return res.status(404).json({ error: "Assigned cargo run not found." });
        }

        if (!shipment.transporter_id || Number(shipment.transporter_id) !== transporterID) {
            return res.status(403).json({ error: "Unauthorized access to this manifest." });
        }

        if (shipment.status === 'Delivered') {
            return res.status(400).json({ error: "Cannot abort a delivered shipment." });
        }

        const reason = incident_reason || "Critical Transit Breakdown / Accident Reported";

        await db.from('shipments').update({
            status: 'Transit Aborted / Emergency',
            risk: 'High',
            ai_action: `CRITICAL: ${reason}. Manual fleet intervention required.`
        }).eq('id', Number(shipmentID));

        return res.status(200).json({ Success: "Emergency transit abort broadcasted to all monitors." });
    } catch (err) {
        return res.status(500).json({ error: "Failed to log transit emergency: " + err.message });
    }
}

// 9. CLEAR TRANSPORTER RECORD (Soft Delete for Transporter)
export async function clearTransporterShipment(req, res) {
    const sessionUserId = req.session?.userId;
    const { id } = req.params;

    if (!sessionUserId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        await db.from('shipments').update({
            displaytotransporter: false
        }).eq('id', Number(id));

        return res.status(200).json({ Success: "Run cleared from driver view." });
    } catch (err) {
        return res.status(500).json({ error: "Failed to clear record: " + err.message });
    }
}

// 10. GENERAL QUERY & INVENTORY ENDPOINTS
export async function getGlobalInventoryMatrix(req, res) {
    try {
        const { data: warehouses } = await db.from('users').select('userID, username').eq('role', 'warehouse');
        const { data: inventory } = await db.from('inventory').select('*');
        return res.status(200).json({ warehouses: warehouses || [], inventory: inventory || [] });
    } catch (err) {
        return res.status(500).json({ Error: "Matrix link decoupled." });
    }
}

export async function allShipments(req, res) {
    try {
        const { data } = await db.from('shipments').select('*');
        return res.status(200).json(data || []);
    } catch (err) {
        return res.status(500).json({ Error: "Fetch failed." });
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
        return res.status(200).json(results);
    } catch (err) {
        return res.status(500).json({ Error: "Feed retrieval error." });
    }
}

export async function getInventory(req, res) {
    const warehouseID = Number(req.params.userID);
    try {
        const { data } = await db.from('inventory').select('*').eq('warehouseID', warehouseID);
        return res.status(200).json(data || []);
    } catch (err) {
        return res.status(500).json({ Error: "Inventory fetch failed." });
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
        return res.status(200).json({ Success: "Inventory updated." });
    } catch (err) {
        return res.status(500).json({ Error: "Inventory augmentation failure." });
    }
}

export async function updateShipment(req, res) {
    const sessionUserId = req.session?.userId;
    const userID = Number(req.params.userID || sessionUserId);
    if (!sessionUserId || userID !== Number(sessionUserId)) {
        return res.status(401).json({ Error: "Please login first!" });
    }

    const { id, status } = req.body;
    if (!id || !status) {
        return res.status(400).json({ error: "Please enter all details to update shipment." });
    }

    try {
        await db.from('shipments').update({ status }).eq('id', id);
        return res.status(200).json({ Success: "Status updated." });
    } catch (err) {
        return res.status(500).json({ Error: "Update failed." });
    }
}

export async function clearShipment(req, res) {
    const userID = Number(req.params.userID || req.session?.userId);
    const { id } = req.params;
    try {
        const { data: shipment } = await db.from('shipments').select('*').eq('id', id).single();
        if (!shipment) return res.status(404).json({ Error: "Not found." });

        let updateData = {};
        if (shipment.sourceID === userID) updateData = { displayToSource: false };
        else if (shipment.userID === userID) updateData = { displayToDest: false };

        await db.from('shipments').update(updateData).eq('id', id);
        return res.status(200).json({ Success: "Cleared." });
    } catch (err) {
        return res.status(500).json({ Error: "Failed to clear." });
    }
}

export async function finalizeDeliveryAndPurge(req, res) {
    const sessionUserId = req.session?.userId;
    const transporterID = Number(sessionUserId || req.params.transporterID);
    const { shipmentID } = req.body;

    if (!sessionUserId) {
        return res.status(401).json({ error: "Unauthorized: Active driver session not found." });
    }

    try {
        const { data: shipment, error: sErr } = await db.from('shipments')
            .select('*')
            .eq('id', Number(shipmentID))
            .single();

        if (sErr || !shipment) return res.status(404).json({ error: "Shipment record not found." });

        if (!shipment.transporter_id || Number(shipment.transporter_id) !== transporterID) {
            return res.status(403).json({ error: "Unauthorized: You are not assigned to this delivery." });
        }

        if (shipment.shipment_type === 'W2W') {
            const destWarehouseID = Number(shipment.userID);

            const { data: destInv } = await db.from('inventory')
                .select('*')
                .eq('warehouseID', destWarehouseID)
                .eq('product_name', shipment.product_name)
                .single();

            if (destInv) {
                const updatedStock = destInv.current_stock + shipment.quantity;
                await db.from('inventory').update({
                    current_stock: updatedStock,
                    restocking_needed: updatedStock <= destInv.min_threshold
                }).eq('id', destInv.id);
            } else {
                await db.from('inventory').insert({
                    warehouseID: destWarehouseID,
                    product_name: shipment.product_name,
                    current_stock: shipment.quantity,
                    min_threshold: 10,
                    category: 'General',
                    restocking_needed: false
                });
            }
        }

        await db.from('shipments').delete().eq('id', Number(shipmentID));

        return res.status(200).json({ 
            Success: "Shipment delivered. Destination inventory restocked and record cleared." 
        });
    } catch (err) {
        return res.status(500).json({ error: "Failed to finalize delivery: " + err.message });
    }
}

export async function updateTransporterManualStatus(req, res) {
    const sessionUserId = req.session?.userId;
    const transporterID = Number(sessionUserId || req.params.transporterID);
    const { shipmentID, step, status_text, driver_note } = req.body;

    if (!sessionUserId) {
        return res.status(401).json({ error: "Unauthorized: Active driver session not found." });
    }

    if (!shipmentID) {
        return res.status(400).json({ error: "Shipment ID is required." });
    }

    try {
        // 1. Verify that the shipment exists and is assigned to this driver
        const { data: shipment, error: sErr } = await db.from('shipments')
            .select('*')
            .eq('id', Number(shipmentID))
            .single();

        if (sErr || !shipment) {
            return res.status(404).json({ error: "Shipment manifest not found." });
        }

        if (!shipment.transporter_id || Number(shipment.transporter_id) !== transporterID) {
            return res.status(403).json({ error: "Unauthorized: You are not assigned to this cargo run." });
        }

        // 2. Prepare payload without AI inference overhead
        const updatePayload = {};

        if (step !== undefined) {
            const stepNum = Number(step);
            if (stepNum >= 0 && stepNum <= 10) {
                updatePayload.transit_step = stepNum;
            }
        }

        if (status_text) {
            updatePayload.status = status_text;
        } else if (step !== undefined) {
            updatePayload.status = step === 10 
                ? 'Arrived at Destination — Awaiting Final Handover' 
                : `In Transit (Checkpoint ${step}/10)`;
        }

        // Overwrite or append operational notes directly into ai_action / status
        if (driver_note) {
            updatePayload.ai_action = `Driver Update: ${driver_note}`;
        }

        // 3. Directly update Supabase
        const { error: updateErr } = await db.from('shipments')
            .update(updatePayload)
            .eq('id', Number(shipmentID));

        if (updateErr) throw updateErr;

        return res.status(200).json({
            Success: "Transit status updated successfully.",
            updated: updatePayload
        });

    } catch (err) {
        console.error("Transporter update error:", err.message);
        return res.status(500).json({ error: "Failed to update transit status: " + err.message });
    }
}