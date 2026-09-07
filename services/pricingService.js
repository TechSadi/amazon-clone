import { getDeliveryOption } from '../data/deliveryOptions.js';
import { formatCurrency } from '../utils/money.js';

/** Estimated tax applied to the subtotal plus shipping. */
export const TAX_RATE = 0.1;

/**
 * The single source of truth for cart and order money.
 *
 * Everything is integer cents and only the final tax figure is rounded,
 * so the displayed lines always add up to the displayed total.
 *
 * Expects a hydrated cart: each item carries `product.priceCents`,
 * `quantity` and `deliveryOptionId`.
 */
export function calculateTotals(cart) {
    const items = cart?.items ?? [];

    const subtotalCents = items.reduce(
        (total, item) => total + item.product.priceCents * item.quantity,
        0
    );

    // Each line ships separately in this store, which is why the
    // checkout page offers a delivery option per item.
    const shippingCents = items.reduce(
        (total, item) =>
            total + getDeliveryOption(item.deliveryOptionId).priceCents,
        0
    );

    const totalBeforeTaxCents = subtotalCents + shippingCents;
    const taxCents = Math.round(totalBeforeTaxCents * TAX_RATE);
    const totalCents = totalBeforeTaxCents + taxCents;

    return {
        subtotalCents,
        shippingCents,
        totalBeforeTaxCents,
        taxCents,
        totalCents
    };
}

export function lineTotalCents(item) {
    return item.product.priceCents * item.quantity;
}

/**
 * Formats totals into the exact keys the checkout page and its scripts
 * read, so server-rendered and fetch-updated values cannot drift apart.
 */
export function toDisplayTotals(totals) {
    return {
        subtotal: formatCurrency(totals.subtotalCents),
        totalShippingCost: formatCurrency(totals.shippingCents),
        totalBeforeTax: formatCurrency(totals.totalBeforeTaxCents),
        estimatedTax: formatCurrency(totals.taxCents),
        orderTotal: formatCurrency(totals.totalCents)
    };
}
