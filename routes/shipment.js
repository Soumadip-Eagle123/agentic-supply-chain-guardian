import express from 'express'
import { postShipment, updateShipment, deleteShipment, getShipment, allShipments, updateInventory } from '../controllers/shipmentController.js'
export const shipmentRouter = express.Router({ mergeParams: true });
export const allRouter = express.Router();
export const inventoryRouter = express.Router({ mergeParams: true });
shipmentRouter.post('/send', postShipment);
shipmentRouter.put('/statusChange', updateShipment);
shipmentRouter.delete('/deleteShipment/:id', deleteShipment);
shipmentRouter.get('/getShipment', getShipment)
inventoryRouter.post('/stock', updateInventory)

allRouter.get('/', allShipments);