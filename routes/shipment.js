import express from 'express';
import { 
    postShipment, 
    updateShipment, 
    clearShipment, 
    getShipment, 
    allShipments, 
    updateInventory,
    getInventory,
    getGlobalInventoryMatrix  
} from '../controllers/shipmentController.js';

export const shipmentRouter = express.Router({ mergeParams: true });
export const allRouter = express.Router();
export const inventoryRouter = express.Router({ mergeParams: true });

allRouter.get('/global-matrix', getGlobalInventoryMatrix);
allRouter.get('/', allShipments);

shipmentRouter.post('/send', postShipment);
shipmentRouter.put('/statusChange', updateShipment);
shipmentRouter.delete('/deleteShipment/:id', clearShipment); 
shipmentRouter.get('/getShipment', getShipment);

inventoryRouter.post('/stock', updateInventory);
inventoryRouter.get('/stock', getInventory);