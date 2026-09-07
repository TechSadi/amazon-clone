import express from 'express';
import {
    addToCart,
    loadCart,
    updateQuantity,
    deleteCartItem
} from '../controllers/cart.js';

import { requireLogin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireLogin, loadCart);
router.post('/:productId', requireLogin, addToCart);
router.patch('/:productId', requireLogin, updateQuantity);
router.delete('/:productId', requireLogin, deleteCartItem);

export default router;