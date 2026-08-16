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
    getTransporterShipments,
    cancelWarehouseShipment,
    cancelTransporterShipment,
    clearTransporterShipment,
    confirmPickup,
    finalizeDeliveryAndPurge
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
shipmentRouter.post('/cancel-shipment', cancelWarehouseShipment);

inventoryRouter.post('/stock', updateInventory);
inventoryRouter.get('/stock', getInventory);

transporterRouter.get('/runs', getTransporterShipments);
transporterRouter.post('/update-step', updateTransitStep);
transporterRouter.post('/confirm-pickup', confirmPickup);
transporterRouter.delete('/clear/:id', clearTransporterShipment);
transporterRouter.post('/abort-transit', cancelTransporterShipment);
transporterRouter.post('/finalize-delivery', finalizeDeliveryAndPurge);