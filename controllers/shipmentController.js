import db from '../db/db.js'



function getUsername(userID){
   let username = db.prepare(`SELECT username FROM users WHERE userID=?`).get(userID);
   return username?.username;
}

export function postShipment(req, res){
    const userID = Number(req.params.userID);
    if(userID != req.session.userId) return res.status(401).json({Error: "Please login first!"});
    let {product_name, quantity, source, destination, status} = req.body;
    if(!product_name || !quantity || !source || !destination){
        return res.status(400).json({error: "Please enter all the details of the shipment"})
    }
    try{
        db.prepare(`INSERT INTO shipments(userID, product_name, quantity, source, destination, status) VALUES(
                ?, ?, ?, ?, ?, ?)`).run(userID, product_name, quantity, source, destination, status);
        
        res.status(201).json({Success: `Shipment details for User ${getUsername(userID)} added!`})
    }
    catch(err){
        res.status(500).json({Error: "Couldn't add shipment for the user "})
    }
    
}

export function updateShipment(req, res){
    const userID = Number(req.params.userID);
    if(userID != req.session.userId) return res.status(401).json({Error: "Please login first!"});
    let {id, status} = req.body;
    if(!id || !status){
        return res.status(400).json({error: "Please enter all the details to update shipment"});
    }
    try{
        let result = db.prepare(`UPDATE shipments SET status=? WHERE id = ? AND userID = ?`).run(status, id, userID);
        if(result.changes===0){
            return res.status(400).json({Error: "No such shipment id exists!"});
        }
        res.status(201).json({Success: `Shipment details updated for User ${getUsername(userID)}!`})
    }
    catch(err){
        res.status(500).json({Error: "Couldn't update shipment for the user "})
    }
}

export function deleteShipment(req, res){
    const userID = Number(req.params.userID);
    if(userID != req.session.userId) return res.status(401).json({Error: "Please login first!"});
    let id = req.params.id;
    if(!id){
        return res.status(400).json({error: "Please enter a shipment ID to delete!"});
    }
    try{
       let result = db.prepare(`DELETE FROM shipments WHERE id=? AND userID = ?`).run(id, userID);
       if(result.changes===0){
            return res.status(400).json({Error: "No such shipment id exists, deletion unsuccessful!!"});
        }
        res.status(201).json({Success: `Shipment details deleted for User ${getUsername(userID)}!`})
    }
    catch(err){
       res.status(500).json({Error: "Couldn't delete shipment for the user "})
    }
}

export function getShipment(req, res){
    const userID = Number(req.params.userID);
    if(userID != req.session.userId) return res.status(401).json({Error: "Please login first!"});
    try{
        let results = db.prepare(`SELECT * FROM shipments WHERE userID = ?`).all(userID);
        if(results.length===0) return res.status(400).json({Error: "No shipment initiated till now!"});
        let resultsJSON = {};
        results.forEach(result => {
            resultsJSON[result.id] = {
                product_name: result.product_name,
                quantity: result.quantity,
                source: result.source,
                destination: result.destination,
                status: result.status
            }
        })
        res.status(200).json(resultsJSON);
    }
    catch(err){
       res.status(500).json({Error: "Couldn't get the shipments for the user!"})
    }
}

export function allShipments(req, res){
    try{
        let results = db.prepare(`SELECT * FROM shipments`).all();
        if(results.length === 0) return res.status(401).json({Error: "Database is empty! Useless website XD"});
        let resultsJSON = {};
        results.forEach(result => {
            resultsJSON[result.userID] = {
                id: result.id,
                product_name: result.product_name,
                quantity: result.quantity,
                source: result.source,
                destination: result.destination,
                status: result.status
            }
        })
        res.status(200).json(resultsJSON);
    }
    catch(err){
       res.status(500).json({Error: "Couldn't get the shipments!"})
    }
}