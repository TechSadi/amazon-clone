import express from 'express';
import { getAllProducts } from '../controllers/products.js';
import { showProduct } from '../controllers/products.js';

const router = express.Router();

router.get('/', getAllProducts);

router.get('/category/:category', (req, res) => {
    res.send('product category');
})

router.get('/:id', showProduct)

export default router;