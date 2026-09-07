import express from 'express';
import { loadOrderTracking } from '../controllers/tracking.js'
import { requireLogin } from '../middleware/auth.js';

const router = express.Router();

router.get('/:orderId/:productId', requireLogin, loadOrderTracking);

export default router;