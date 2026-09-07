import * as productService from '../services/productService.js';
import * as cartService from '../services/cartService.js';
import { parseSearchQuery } from '../validators/productValidator.js';
import {
    deliveryDateLabel,
    deliveryOptions
} from '../data/deliveryOptions.js';

export const getAllProducts = async (req, res) => {
    const searchTerm = parseSearchQuery(req.query.q);

    const [products, cartQuantity] = await Promise.all([
        productService.listProducts(searchTerm),
        cartService.getCartQuantity(req.session.userId)
    ]);

    if (products.length === 0) {
        return res.render('products/notfound', {
            q: searchTerm,
            cartQuantity
        });
    }

    res.render('products/index', {
        products,
        q: searchTerm,
        cartQuantity
    });
};

export const showProduct = async (req, res) => {
    const [product, cartQuantity] = await Promise.all([
        productService.getProductById(req.params.productId),
        cartService.getCartQuantity(req.session.userId)
    ]);

    // The buy box quotes real dates from the same delivery table the
    // checkout page charges from, rather than a hard-coded range.
    const standardOption = deliveryOptions[0];
    const fastestOption = deliveryOptions[deliveryOptions.length - 1];

    res.render('products/show', {
        product,
        cartQuantity,
        standardDelivery: {
            date: deliveryDateLabel(standardOption),
            priceCents: standardOption.priceCents
        },
        fastestDelivery: {
            date: deliveryDateLabel(fastestOption),
            priceCents: fastestOption.priceCents
        }
    });
};
