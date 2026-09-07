import { MAX_ITEM_QUANTITY } from '../models/cart.js';
import { findDeliveryOption } from '../data/deliveryOptions.js';
import { badRequest } from '../utils/errors.js';
import { toInteger, toTrimmedString } from '../utils/validation.js';

/**
 * A quantity to add or set.
 *
 * `toInteger` rejects anything that is not a number or a numeric
 * string, so a JSON body of `{"quantity": {"$gt": 0}}` stops here
 * rather than reaching Mongo. It also rejects NaN, which previously
 * sailed through `Number(quantity)` and was written into the cart.
 */
export function parseQuantity(value) {
    const quantity = toInteger(value);

    if (quantity === null || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
        throw badRequest(
            `Quantity must be a whole number between 1 and ${MAX_ITEM_QUANTITY}.`
        );
    }

    return quantity;
}

/** A relative change from the cart page's plus and minus buttons. */
export function parseQuantityChange(value) {
    const change = toInteger(value);

    if (
        change === null ||
        change === 0 ||
        change < -MAX_ITEM_QUANTITY ||
        change > MAX_ITEM_QUANTITY
    ) {
        throw badRequest('That quantity change is not valid.');
    }

    return change;
}

export function parseDeliveryOptionId(value) {
    const deliveryOptionId = toTrimmedString(value, { maxLength: 20 });

    if (!deliveryOptionId || !findDeliveryOption(deliveryOptionId)) {
        throw badRequest('That delivery option is not available.');
    }

    return deliveryOptionId;
}
