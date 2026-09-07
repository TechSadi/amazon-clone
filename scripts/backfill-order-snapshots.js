/**
 * One-off migration: backfill order item snapshots.
 *
 * Orders used to store only a product reference and a grand total, so
 * order history was rendered from whatever the product looked like
 * today and broke outright once a product was deleted. Orders now carry
 * their own copy of the name, image, price, shipping and estimated
 * delivery date.
 *
 * This fills those fields in for orders placed before that change,
 * using the current catalogue as the best available source. The
 * customer-facing `totalPriceCents` is never rewritten: it is the
 * historical record of what was charged. The tax line is derived from
 * it so the breakdown still adds up to the stored total.
 *
 * Safe to run more than once; orders that already carry snapshots are
 * skipped.
 *
 *   npm run migrate
 */
import connectDB, { disconnectDB } from '../config/db.js';
import Order from '../models/order.js';
import Product from '../models/product.js';
import {
    DEFAULT_DELIVERY_OPTION_ID,
    calculateDeliveryDate,
    findDeliveryOption
} from '../data/deliveryOptions.js';

const PLACEHOLDER_IMAGE = 'images/icons/not-found-icon.png';

function needsBackfill(order) {
    return (
        order.subtotalCents === undefined ||
        !Array.isArray(order.items) ||
        order.items.some((item) => item.name === undefined)
    );
}

const run = async () => {
    await connectDB();

    const collection = Order.collection;
    const orders = await collection.find({}).toArray();
    const pending = orders.filter(needsBackfill);

    console.log(
        `${orders.length} order(s) found, ${pending.length} need backfilling.`
    );

    if (pending.length === 0) {
        await disconnectDB();
        return;
    }

    const productIds = pending.flatMap((order) =>
        (order.items || []).map((item) => item.product)
    );

    const products = await Product.find({ _id: { $in: productIds } })
        .select('name image priceCents')
        .lean();

    const productsById = new Map(
        products.map((product) => [String(product._id), product])
    );

    let migrated = 0;
    let unreconciled = 0;
    let missingProducts = 0;

    for (const order of pending) {
        const placedAt = order.createdAt || new Date();

        const items = (order.items || []).map((item) => {
            const product = productsById.get(String(item.product));

            if (!product) {
                missingProducts += 1;
            }

            const deliveryOptionId =
                item.deliveryOptionId || DEFAULT_DELIVERY_OPTION_ID;

            const deliveryOption =
                findDeliveryOption(deliveryOptionId) ||
                findDeliveryOption(DEFAULT_DELIVERY_OPTION_ID);

            return {
                product: item.product,
                name: product ? product.name : 'Product no longer available',
                image: product ? product.image : PLACEHOLDER_IMAGE,
                priceCents: product ? product.priceCents : 0,
                quantity: item.quantity || 1,
                deliveryOptionId: deliveryOption.id,
                shippingCents: deliveryOption.priceCents,
                estimatedDeliveryDate: calculateDeliveryDate(
                    deliveryOption,
                    placedAt
                )
            };
        });

        const subtotalCents = items.reduce(
            (total, item) => total + item.priceCents * item.quantity,
            0
        );

        const shippingCents = items.reduce(
            (total, item) => total + item.shippingCents,
            0
        );

        const totalPriceCents = order.totalPriceCents ?? 0;

        // Derived rather than recalculated, so the parts still sum to
        // the amount the customer was actually charged.
        const taxCents = totalPriceCents - subtotalCents - shippingCents;

        if (taxCents < 0) {
            unreconciled += 1;

            console.warn(
                `  order ${order._id}: stored total ${totalPriceCents} is below the current subtotal + shipping (${subtotalCents + shippingCents}). Prices have changed since it was placed; tax recorded as 0.`
            );
        }

        await collection.updateOne(
            { _id: order._id },
            {
                $set: {
                    items,
                    subtotalCents,
                    shippingCents,
                    taxCents: Math.max(0, taxCents),
                    totalPriceCents,
                    status: order.status || 'placed'
                }
            }
        );

        migrated += 1;
    }

    console.log(`Backfilled ${migrated} order(s).`);

    if (missingProducts > 0) {
        console.log(
            `${missingProducts} item(s) referenced a product that no longer exists and were labelled as unavailable.`
        );
    }

    if (unreconciled > 0) {
        console.log(
            `${unreconciled} order(s) could not be reconciled exactly. Their stored totals were preserved.`
        );
    }

    await disconnectDB();
};

run().catch(async (error) => {
    console.error('Migration failed:', error.message);

    await disconnectDB().catch(() => {});

    process.exit(1);
});
