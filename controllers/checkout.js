import * as cartService from '../services/cartService.js';
import * as orderService from '../services/orderService.js';
import {
    calculateTotals,
    lineTotalCents,
    toDisplayTotals
} from '../services/pricingService.js';
import {
    parseQuantity,
    parseDeliveryOptionId
} from '../validators/cartValidator.js';
import {
    deliveryDateLabel,
    deliveryOptions,
    getDeliveryOption
} from '../data/deliveryOptions.js';
import { formatCurrency } from '../utils/money.js';
import { MAX_ITEM_QUANTITY } from '../models/cart.js';

/**
 * Reads the cart back and formats every figure the order summary shows.
 * Used by the page render and by each of the fetch endpoints, so all of
 * them agree on the numbers.
 */
async function checkoutSnapshot(userId) {
    const cart = await cartService.getHydratedCart(userId);
    const totals = calculateTotals(cart);

    return {
        cart: cart ?? { items: [] },
        cartQuantity: cartService.calculateCartQuantity(cart),
        ...toDisplayTotals(totals)
    };
}

export const loadCheckout = async (req, res) => {
    const snapshot = await checkoutSnapshot(req.session.userId);

    // An empty cart is a normal state, not a 404. The previous version
    // answered a browser navigation with a JSON error body.
    res.render('checkout/checkout', {
        ...snapshot,
        deliveryOptions,
        getDeliveryOption,
        deliveryDateLabel,
        maxItemQuantity: MAX_ITEM_QUANTITY
    });
};

export const updateQuantity = async (req, res) => {
    const quantity = parseQuantity(req.body.newQuantity);

    await cartService.setItemQuantity(
        req.session.userId,
        req.params.productId,
        quantity
    );

    const snapshot = await checkoutSnapshot(req.session.userId);

    const item = snapshot.cart.items.find(
        (candidate) =>
            String(candidate.product._id) === req.params.productId
    );

    res.json({
        updated: true,
        itemQuantity: quantity,
        cartItemPrice: formatCurrency(item ? lineTotalCents(item) : 0),
        cartQuantity: snapshot.cartQuantity,
        subtotal: snapshot.subtotal,
        totalShippingCost: snapshot.totalShippingCost,
        totalBeforeTax: snapshot.totalBeforeTax,
        estimatedTax: snapshot.estimatedTax,
        orderTotal: snapshot.orderTotal
    });
};

export const deleteCartItem = async (req, res) => {
    await cartService.removeItem(req.session.userId, req.params.productId);

    const snapshot = await checkoutSnapshot(req.session.userId);

    res.json({
        deleted: true,
        cartQuantity: snapshot.cartQuantity,
        subtotal: snapshot.subtotal,
        totalShippingCost: snapshot.totalShippingCost,
        totalBeforeTax: snapshot.totalBeforeTax,
        estimatedTax: snapshot.estimatedTax,
        orderTotal: snapshot.orderTotal
    });
};

export const updateDeliveryOption = async (req, res) => {
    const deliveryOptionId = parseDeliveryOptionId(req.body.deliveryOptionId);

    await cartService.setItemDeliveryOption(
        req.session.userId,
        req.params.productId,
        deliveryOptionId
    );

    const snapshot = await checkoutSnapshot(req.session.userId);

    res.json({
        updated: true,
        deliveryOptionId,
        deliveryDate: deliveryDateLabel(getDeliveryOption(deliveryOptionId)),
        totalShippingCost: snapshot.totalShippingCost,
        totalBeforeTax: snapshot.totalBeforeTax,
        estimatedTax: snapshot.estimatedTax,
        orderTotal: snapshot.orderTotal
    });
};

export const placeOrder = async (req, res) => {
    const order = await orderService.placeOrder(req.session.userId);

    res.status(201).json({
        ordered: true,
        orderId: String(order._id)
    });
};
