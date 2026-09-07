import express from 'express'
import {
    loadCheckout,
    updateQuantity,
    deleteCartItem,
    updateDeliveryOption,
    placeOrder
} from '../controllers/checkout.js'

import { requireLogin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireLogin, loadCheckout);
router.post('/place-order', requireLogin, placeOrder);
router.patch('/:productId/delivery-option', requireLogin, updateDeliveryOption);
router.patch('/:productId', requireLogin, updateQuantity);
router.delete('/:productId', requireLogin, deleteCartItem);

export default router;