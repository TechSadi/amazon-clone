import express from 'express';

import {
    loadCheckout,
    updateQuantity,
    deleteCartItem,
    updateDeliveryOption,
    placeOrder
} from '../controllers/checkout.js';

import { requireLogin } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validate.js';
import { expectsJson } from '../middleware/errorHandler.js';
import { orderLimiter, writeLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

router.get('/', requireLogin, loadCheckout);

router.post(
    '/place-order',
    expectsJson,
    orderLimiter,
    requireLogin,
    placeOrder
);

router.patch(
    '/:productId/delivery-option',
    expectsJson,
    writeLimiter,
    requireLogin,
    validateObjectId('productId'),
    updateDeliveryOption
);

router.patch(
    '/:productId',
    expectsJson,
    writeLimiter,
    requireLogin,
    validateObjectId('productId'),
    updateQuantity
);

router.delete(
    '/:productId',
    expectsJson,
    writeLimiter,
    requireLogin,
    validateObjectId('productId'),
    deleteCartItem
);

export default router;
