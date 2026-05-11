import express from 'express'
import { signup, loginUser, loginWarehouse, logoutUser, logoutWarehouse } from '../controllers/authController.js'

export const authRouter = express.Router();

authRouter.post('/signup/user', signup);   
authRouter.post('/signup/warehouse', signup); 
authRouter.post('/login/user', loginUser);
authRouter.post('/login/warehouse', loginWarehouse);
authRouter.get('/logout/user', logoutUser);
authRouter.get('/logout/warehouse', logoutWarehouse);

