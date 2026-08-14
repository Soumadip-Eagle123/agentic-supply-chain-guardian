import express from 'express';
import { 
    signup, 
    loginUser, 
    loginWarehouse, 
    loginTransporter, 
    logoutUser, 
    logoutWarehouse, 
    logoutTransporter, 
    getWarehouses 
} from '../controllers/authController.js';

export const authRouter = express.Router();

authRouter.post('/signup/user', signup);
authRouter.post('/signup/warehouse', signup);
authRouter.post('/signup/transporter', signup);

authRouter.post('/login/user', loginUser);
authRouter.post('/login/warehouse', loginWarehouse);
authRouter.post('/login/transporter', loginTransporter);

authRouter.get('/logout/user', logoutUser);
authRouter.get('/logout/warehouse', logoutWarehouse);
authRouter.get('/logout/transporter', logoutTransporter);

authRouter.get('/warehouses', getWarehouses);
