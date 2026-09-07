import Product from '../models/product.js';
import Cart from '../models/cart.js';
import { calculateCartQuantity } from '../utils/cart.js';

export const getAllProducts = async (req, res) => {

    const { q } = req.query;

    let products;

    if (q) {
        products = await Product.find({
            $or: [
                {
                    name: {
                        $regex: q,
                        $options: 'i'
                    }
                },
                {
                    keywords: {
                        $regex: q,
                        $options: 'i'
                    }
                }
            ]
        });
    }
    else {
        products = await Product.find({});
    }

    const cart = await Cart.findOne({ user: req.session.userId });
    const cartQuantity = calculateCartQuantity(cart)

    if (products.length === 0) {
        res.render('products/notfound', {q, cartQuantity, cart})
    }
    else {
        res.render('products', { products, q, cartQuantity,cart})
    }
    
}

export const showProduct = async (req, res) => {
    const cart = await Cart.findOne({ user: req.session.userId });
    const cartQuantity = calculateCartQuantity(cart);
    const product = await Product.findById(req.params.id);

    res.render('products/show', { product, cartQuantity, cart});
}
