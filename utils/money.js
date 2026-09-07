/**
 * All money in this application is stored and calculated as integer
 * cents. Values are converted to a decimal string only at the point of
 * display, so no rounding error can accumulate.
 */
export function formatCurrency(priceCents) {
    if (!Number.isFinite(priceCents)) {
        return '0.00';
    }

    return (Math.round(priceCents) / 100).toFixed(2);
}
