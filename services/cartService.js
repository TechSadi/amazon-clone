import Cart, { MAX_ITEM_QUANTITY } from '../models/cart.js';
import Product from '../models/product.js';
import { DEFAULT_DELIVERY_OPTION_ID } from '../data/deliveryOptions.js';
import { notFound } from '../utils/errors.js';

/** Fields of a product that the cart and checkout pages actually render. */
const PRODUCT_FIELDS = 'name image priceCents rating';

export function calculateCartQuantity(cart) {
    if (!cart || !Array.isArray(cart.items)) {
        return 0;
    }

    return cart.items.reduce(
        (total, item) => total + (item.quantity || 0),
        0
    );
}

/**
 * Header badge count.
 *
 * Returns 0 for signed-out visitors. The previous version passed an
 * undefined user id straight into the filter; Mongoose strips undefined
 * values, so the query degraded to "any cart" and guests were shown
 * another account's item count.
 */
export async function getCartQuantity(userId) {
    if (!userId) {
        return 0;
    }

    const cart = await Cart.findOne(
        { user: userId },
        { 'items.quantity': 1 }
    ).lean();

    return calculateCartQuantity(cart);
}

/**
 * Loads the cart with each item's product details attached.
 *
 * Items whose product has since been deleted are dropped from the cart
 * rather than left to blow up every page that reads `item.product`.
 */
export async function getHydratedCart(userId) {
    if (!userId) {
        return null;
    }

    const cart = await Cart.findOne({ user: userId }).lean();

    if (!cart) {
        return null;
    }

    if (cart.items.length === 0) {
        return cart;
    }

    const products = await Product.find(
        { _id: { $in: cart.items.map((item) => item.product) } },
        PRODUCT_FIELDS
    ).lean();

    const productsById = new Map(
        products.map((product) => [String(product._id), product])
    );

    const keptItems = [];
    const missingProductIds = [];

    for (const item of cart.items) {
        const product = productsById.get(String(item.product));

        if (product) {
            keptItems.push({ ...item, product });
        } else {
            missingProductIds.push(item.product);
        }
    }

    if (missingProductIds.length > 0) {
        await Cart.updateOne(
            { _id: cart._id },
            { $pull: { items: { product: { $in: missingProductIds } } } }
        );

        // The prune moved the document on, so refresh the version marker
        // that placeOrder's optimistic check relies on.
        const refreshed = await Cart.findOne(
            { _id: cart._id },
            { updatedAt: 1 }
        ).lean();

        if (refreshed) {
            cart.updatedAt = refreshed.updatedAt;
        }
    }

    return { ...cart, items: keptItems };
}

/**
 * Adds a quantity of a product to the cart.
 *
 * Written as targeted atomic updates rather than read-modify-write, so
 * two rapid clicks cannot overwrite each other's change.
 */
export async function addItem(userId, productId, quantity) {
    const product = await Product.findById(productId)
        .select('_id')
        .lean();

    if (!product) {
        throw notFound('That product is no longer available.');
    }

    const incremented = await Cart.updateOne(
        { user: userId, 'items.product': productId },
        { $inc: { 'items.$.quantity': quantity } }
    );

    if (incremented.matchedCount === 0) {
        try {
            await Cart.updateOne(
                { user: userId, 'items.product': { $ne: productId } },
                {
                    $push: {
                        items: {
                            $each: [
                                {
                                    product: productId,
                                    quantity,
                                    deliveryOptionId:
                                        DEFAULT_DELIVERY_OPTION_ID
                                }
                            ],
                            $position: 0
                        }
                    }
                },
                { upsert: true }
            );
        } catch (error) {
            if (error?.code !== 11000) {
                throw error;
            }

            // A concurrent request created this user's cart first.
            await Cart.updateOne(
                { user: userId, 'items.product': productId },
                { $inc: { 'items.$.quantity': quantity } }
            );
        }
    }

    await clampItemQuantity(userId, productId);
}

/** Sets an item to an exact quantity. Used by the checkout page. */
export async function setItemQuantity(userId, productId, quantity) {
    const result = await Cart.updateOne(
        { user: userId, 'items.product': productId },
        { $set: { 'items.$.quantity': quantity } }
    );

    if (result.matchedCount === 0) {
        throw notFound('That product is not in your cart.');
    }

    return quantity;
}

/** Applies a relative change. Used by the cart page's +/- buttons. */
export async function changeItemQuantity(userId, productId, change) {
    const updated = await Cart.findOneAndUpdate(
        { user: userId, 'items.product': productId },
        { $inc: { 'items.$.quantity': change } },
        { returnDocument: 'after', projection: { items: 1 } }
    ).lean();

    if (!updated) {
        throw notFound('That product is not in your cart.');
    }

    const item = updated.items.find(
        (candidate) => String(candidate.product) === String(productId)
    );

    const clamped = Math.min(
        MAX_ITEM_QUANTITY,
        Math.max(1, item.quantity)
    );

    if (clamped !== item.quantity) {
        await Cart.updateOne(
            { user: userId, 'items.product': productId },
            { $set: { 'items.$.quantity': clamped } }
        );
    }

    return clamped;
}

export async function setItemDeliveryOption(
    userId,
    productId,
    deliveryOptionId
) {
    const result = await Cart.updateOne(
        { user: userId, 'items.product': productId },
        { $set: { 'items.$.deliveryOptionId': deliveryOptionId } }
    );

    if (result.matchedCount === 0) {
        throw notFound('That product is not in your cart.');
    }
}

export async function removeItem(userId, productId) {
    const result = await Cart.updateOne(
        { user: userId },
        { $pull: { items: { product: productId } } }
    );

    if (result.modifiedCount === 0) {
        throw notFound('That product is not in your cart.');
    }
}

/**
 * Empties the cart, but only if it still looks exactly as it did when
 * the caller priced it.
 *
 * Returns the items that were removed, or null when the cart was
 * already empty or has changed since. That makes it a one-shot claim:
 * a double-submitted "Place your order" can only succeed once.
 */
export async function claimItemsForOrder(userId, expectedUpdatedAt) {
    const claimed = await Cart.findOneAndUpdate(
        {
            user: userId,
            updatedAt: expectedUpdatedAt,
            'items.0': { $exists: true }
        },
        { $set: { items: [] } },
        { returnDocument: 'before' }
    ).lean();

    return claimed ? claimed.items : null;
}

/** Puts claimed items back if the order could not be written. */
export async function restoreItems(userId, items) {
    await Cart.updateOne({ user: userId }, { $set: { items } });
}

async function clampItemQuantity(userId, productId) {
    await Cart.updateOne(
        {
            user: userId,
            items: {
                $elemMatch: {
                    product: productId,
                    quantity: { $gt: MAX_ITEM_QUANTITY }
                }
            }
        },
        { $set: { 'items.$.quantity': MAX_ITEM_QUANTITY } }
    );
}
