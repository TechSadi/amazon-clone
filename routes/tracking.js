import express from 'express';

import { loadOrderTracking } from '../controllers/tracking.js';
import { requireLogin } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validate.js';

const router = express.Router();

router.get(
    '/:orderId/:productId',
    requireLogin,
    validateObjectId('orderId'),
    validateObjectId('productId'),
    loadOrderTracking
);

export default router;
