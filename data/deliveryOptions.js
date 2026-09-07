import dayjs from 'dayjs';
import { badRequest } from '../utils/errors.js';

export const DEFAULT_DELIVERY_OPTION_ID = '1';

export const deliveryOptions = Object.freeze([
    Object.freeze({ id: '1', deliveryDays: 7, priceCents: 0 }),
    Object.freeze({ id: '2', deliveryDays: 3, priceCents: 400 }),
    Object.freeze({ id: '3', deliveryDays: 1, priceCents: 999 })
]);

const optionsById = new Map(
    deliveryOptions.map((option) => [option.id, option])
);

/** Returns the option, or null when the id is unknown. Use in validators. */
export function findDeliveryOption(deliveryOptionId) {
    if (typeof deliveryOptionId !== 'string') {
        return null;
    }

    return optionsById.get(deliveryOptionId) || null;
}

/**
 * Returns the option or throws.
 *
 * The previous implementation silently fell back to the free option,
 * which meant an unknown id quietly stopped charging for shipping.
 */
export function getDeliveryOption(deliveryOptionId) {
    const option = findDeliveryOption(deliveryOptionId);

    if (!option) {
        throw badRequest('That delivery option is not available.');
    }

    return option;
}

function isWeekend(date) {
    const dayOfWeek = date.day();

    return dayOfWeek === 0 || dayOfWeek === 6;
}

/**
 * Adds the option's business days to `from` and returns a Date.
 *
 * `from` matters: an order's estimated delivery has to be measured from
 * when the order was placed, not from whenever the page is rendered.
 */
export function calculateDeliveryDate(deliveryOption, from = new Date()) {
    let remainingDays = deliveryOption.deliveryDays;
    let deliveryDate = dayjs(from);

    while (remainingDays > 0) {
        deliveryDate = deliveryDate.add(1, 'day');

        if (!isWeekend(deliveryDate)) {
            remainingDays--;
        }
    }

    return deliveryDate.toDate();
}

export function formatDeliveryDate(date) {
    return dayjs(date).format('dddd, MMMM D');
}

/** Convenience for views: the formatted date for an option. */
export function deliveryDateLabel(deliveryOption, from = new Date()) {
    return formatDeliveryDate(calculateDeliveryDate(deliveryOption, from));
}
