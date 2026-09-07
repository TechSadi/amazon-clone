import * as cartService from '../services/cartService.js';
import { calculateTotals, lineTotalCents } from '../services/pricingService.js';
import {
    parseQuantity,
    parseQuantityChange
} from '../validators/cartValidator.js';
import { formatCurrency } from '../utils/money.js';
import { MAX_ITEM_QUANTITY } from '../models/cart.js';

/**
 * Every response here reports the cart as the database now holds it,
 * read back after the change. The header badge, the cart page and the
 * checkout page therefore cannot drift apart.
 */
async function cartSnapshot(userId) {
    const cart = await cartService.getHydratedCart(userId);
    const totals = calculateTotals(cart);

    return {
        cart,
        cartQuantity: cartService.calculateCartQuantity(cart),
        subtotal: formatCurrency(totals.subtotalCents)
    };
}

export const addToCart = async (req, res) => {
    const quantity = parseQuantity(req.body.quantity);

    await cartService.addItem(
        req.session.userId,
        req.params.productId,
        quantity
    );

    const { cartQuantity } = await cartSnapshot(req.session.userId);

    res.json({
        added: true,
        message: 'Product added to cart',
        cartQuantity
    });
};

export const loadCart = async (req, res) => {
    const { cart, cartQuantity, subtotal } = await cartSnapshot(
        req.session.userId
    );

    res.render('cart/cart', {
        cart,
        cartQuantity,
        subtotal,
        // The quantity stepper disables itself at the same ceiling the
        // server enforces, so the visitor never gets a rejection they
        // could have been shown up front.
        maxItemQuantity: MAX_ITEM_QUANTITY
    });
};

export const updateQuantity = async (req, res) => {
    const itemQuantity = await cartService.changeItemQuantity(
        req.session.userId,
        req.params.productId,
        parseQuantityChange(req.body.quantityChange)
    );

    const { cart, cartQuantity, subtotal } = await cartSnapshot(
        req.session.userId
    );

    const item = cart?.items.find(
        (candidate) => String(candidate.product._id) === req.params.productId
    );

    res.json({
        updated: true,
        itemQuantity,
        // The line total is formatted here for the same reason as every
        // other figure: the browser never does arithmetic on money.
        itemPrice: formatCurrency(item ? lineTotalCents(item) : 0),
        cartQuantity,
        subtotal
    });
};

export const deleteCartItem = async (req, res) => {
    await cartService.removeItem(req.session.userId, req.params.productId);

    const { cartQuantity, subtotal } = await cartSnapshot(
        req.session.userId
    );

    res.json({
        deleted: true,
        cartQuantity,
        subtotal
    });
};
