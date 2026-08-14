import express from 'express';
import {
    postShipment,
    updateShipment,
    clearShipment,
    getShipment,
    allShipments,
    updateInventory,
    getInventory,
    getGlobalInventoryMatrix,
    acceptShipmentOrder,
    confirmW2WTransfer,
    updateTransitStep,
    getTransporterShipments
} from '../controllers/shipmentController.js';

export const shipmentRouter = express.Router({ mergeParams: true });
export const allRouter = express.Router();
export const inventoryRouter = express.Router({ mergeParams: true });
export const transporterRouter = express.Router({ mergeParams: true });

allRouter.get('/global-matrix', getGlobalInventoryMatrix);
allRouter.get('/', allShipments);

shipmentRouter.post('/send', postShipment);
shipmentRouter.put('/statusChange', updateShipment);
shipmentRouter.delete('/deleteShipment/:id', clearShipment);
shipmentRouter.get('/getShipment', getShipment);

shipmentRouter.post('/accept-order', acceptShipmentOrder);
shipmentRouter.post('/confirm-w2w', confirmW2WTransfer);

inventoryRouter.post('/stock', updateInventory);
inventoryRouter.get('/stock', getInventory);

transporterRouter.get('/runs', getTransporterShipments);
transporterRouter.post('/update-step', updateTransitStep);