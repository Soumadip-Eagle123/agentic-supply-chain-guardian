import express from 'express'
import { 
    postShipment, 
    updateShipment, 
    clearShipment, 
    getShipment, 
    allShipments, 
    updateInventory,
    getInventory  
} from '../controllers/shipmentController.js'

export const shipmentRouter = express.Router({ mergeParams: true });
export const allRouter = express.Router();
export const inventoryRouter = express.Router({ mergeParams: true });

shipmentRouter.post('/:userID/send', postShipment);
shipmentRouter.put('/:userID/statusChange', updateShipment);

shipmentRouter.delete('/:userID/deleteShipment/:id', clearShipment); 

shipmentRouter.get('/:userID/getShipment', getShipment);

inventoryRouter.post('/:userID/stock', updateInventory);
inventoryRouter.get('/:userID/stock', getInventory); // For the Warehouse Monitor bars

allRouter.get('/', allShipments);