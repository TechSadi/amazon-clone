import express from 'express';

import {
    addToCart,
    loadCart,
    updateQuantity,
    deleteCartItem
} from '../controllers/cart.js';

import { requireLogin } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validate.js';
import { expectsJson } from '../middleware/errorHandler.js';
import { writeLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

router.get('/', requireLogin, loadCart);

// expectsJson runs before requireLogin so that a signed-out fetch call
// receives a 401 in JSON rather than a redirect to an HTML page.
router.post(
    '/:productId',
    expectsJson,
    writeLimiter,
    requireLogin,
    validateObjectId('productId'),
    addToCart
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
