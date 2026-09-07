import express from 'express';

import { getAllProducts, showProduct } from '../controllers/products.js';
import { validateObjectId } from '../middleware/validate.js';

const router = express.Router();

router.get('/', getAllProducts);

router.get('/:productId', validateObjectId('productId'), showProduct);

export default router;
