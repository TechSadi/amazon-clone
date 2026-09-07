import dayjs from 'dayjs';

import Order from '../models/order.js';
import * as cartService from './cartService.js';
import { calculateTotals } from './pricingService.js';
import {
    calculateDeliveryDate,
    formatDeliveryDate,
    getDeliveryOption
} from '../data/deliveryOptions.js';
import { formatCurrency } from '../utils/money.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';

/**
 * Turns the signed-in user's cart into an order.
 *
 * Prices, shipping and tax are all read from the database and the
 * server's own delivery table. Nothing about the total comes from the
 * request, so a crafted payload cannot change what is charged.
 */
export async function placeOrder(userId) {
    const cart = await cartService.getHydratedCart(userId);

    if (!cart || cart.items.length === 0) {
        throw badRequest('Your cart is empty.');
    }

    const totals = calculateTotals(cart);
    const placedAt = new Date();

    const items = cart.items.map((item) => {
        const deliveryOption = getDeliveryOption(item.deliveryOptionId);

        return {
            product: item.product._id,
            name: item.product.name,
            image: item.product.image,
            priceCents: item.product.priceCents,
            quantity: item.quantity,
            deliveryOptionId: item.deliveryOptionId,
            shippingCents: deliveryOption.priceCents,
            estimatedDeliveryDate: calculateDeliveryDate(
                deliveryOption,
                placedAt
            )
        };
    });

    // Claim the cart before writing the order. Only one request can win
    // this, so a double-clicked "Place your order" cannot create two
    // orders, and a stale checkout page cannot order what is no longer
    // in the cart.
    const claimedItems = await cartService.claimItemsForOrder(
        userId,
        cart.updatedAt
    );

    if (!claimedItems) {
        throw conflict(
            'Your cart changed while we were placing this order. Please review it and try again.'
        );
    }

    try {
        return await Order.create({
            user: userId,
            items,
            subtotalCents: totals.subtotalCents,
            shippingCents: totals.shippingCents,
            taxCents: totals.taxCents,
            totalPriceCents: totals.totalCents
        });
    } catch (error) {
        // The order did not persist, so give the customer their cart
        // back rather than losing it.
        await cartService.restoreItems(userId, claimedItems);

        throw error;
    }
}

/** Orders belonging to this user, newest first, ready to render. */
export async function listOrdersForUser(userId) {
    const orders = await Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .lean();

    return orders.map(toOrderView);
}

/**
 * Loads one item of one order.
 *
 * The user id is part of the filter, so another account's order simply
 * does not exist as far as this function is concerned. It reports 404
 * rather than 403 so the response does not confirm that the order id is
 * real.
 */
export async function getOrderItemForUser(userId, orderId, productId) {
    const order = await Order.findOne({
        _id: orderId,
        user: userId
    }).lean();

    if (!order) {
        throw notFound('We could not find that order.');
    }

    const item = order.items.find(
        (candidate) => String(candidate.product) === productId
    );

    if (!item) {
        throw notFound('We could not find that item in your order.');
    }

    return { order, item };
}

/**
 * How far along the delivery window we are, as a whole percentage.
 *
 * Both ends are stored Dates. The previous version re-parsed a
 * human-readable string such as "Monday, June 3", which dayjs could not
 * read, so the progress bar was always NaN and never moved.
 */
export function calculateDeliveryProgress(order, item, now = new Date()) {
    const start = new Date(order.createdAt).getTime();
    const end = new Date(item.estimatedDeliveryDate).getTime();

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return 100;
    }

    const percent = ((now.getTime() - start) / (end - start)) * 100;

    return Math.min(100, Math.max(0, Math.round(percent)));
}

function toOrderView(order) {
    return {
        id: String(order._id),
        placedOnLabel: dayjs(order.createdAt).format('MMMM D'),
        totalLabel: formatCurrency(order.totalPriceCents),

        items: order.items.map((item) => ({
            productId: String(item.product),
            name: item.name,
            image: item.image,
            quantity: item.quantity,
            deliveryDateLabel: formatDeliveryDate(item.estimatedDeliveryDate)
        }))
    };
}
