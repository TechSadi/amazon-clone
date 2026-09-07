import express from 'express'
import { loadOrders } from '../controllers/orders.js';
import { requireLogin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireLogin, loadOrders);

export default router
