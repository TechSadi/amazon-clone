/**
 * Unit tests for the pure logic: money, input parsing, pricing,
 * delivery dates, redirect safety and the CSRF token comparison.
 *
 * Uses the Node test runner, so there is no test dependency to install
 * or keep patched. Run with `npm test`.
 *
 * Nothing here touches MongoDB. The database-backed paths are covered
 * by the manual checklist in the README rather than pretended at here.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatCurrency } from '../utils/money.js';
import { safeReturnTo } from '../utils/redirects.js';
import { secureCompare } from '../utils/secureCompare.js';
import {
    escapeRegex,
    isObjectId,
    isValidEmail,
    toInteger,
    toTrimmedString
} from '../utils/validation.js';
import {
    calculateTotals,
    lineTotalCents,
    TAX_RATE
} from '../services/pricingService.js';
import {
    calculateDeliveryDate,
    deliveryOptions,
    findDeliveryOption,
    getDeliveryOption
} from '../data/deliveryOptions.js';
import {
    parseDeliveryOptionId,
    parseQuantity,
    parseQuantityChange
} from '../validators/cartValidator.js';
import { parseSearchQuery } from '../validators/productValidator.js';
import {
    validateLogin,
    validateRegistration
} from '../validators/userValidator.js';

describe('formatCurrency', () => {
    it('renders cents as a two-decimal string', () => {
        assert.equal(formatCurrency(0), '0.00');
        assert.equal(formatCurrency(1090), '10.90');
        assert.equal(formatCurrency(999999), '9999.99');
    });

    it('never returns NaN', () => {
        assert.equal(formatCurrency(undefined), '0.00');
        assert.equal(formatCurrency('abc'), '0.00');
    });
});

describe('safeReturnTo', () => {
    it('accepts a path on this site', () => {
        assert.equal(safeReturnTo('/checkout'), '/checkout');
        assert.equal(safeReturnTo('/cart?x=1'), '/cart?x=1');
    });

    it('refuses anything that could leave the site', () => {
        assert.equal(safeReturnTo('//evil.example'), '/products');
        assert.equal(safeReturnTo('https://evil.example'), '/products');
        assert.equal(safeReturnTo('javascript:alert(1)'), '/products');
        assert.equal(safeReturnTo(undefined), '/products');
        assert.equal(safeReturnTo({ toString: () => '/ok' }), '/products');
    });
});

describe('secureCompare', () => {
    it('matches only an identical string', () => {
        assert.equal(secureCompare('abc123', 'abc123'), true);
        assert.equal(secureCompare('abc123', 'abc124'), false);
    });

    it('refuses empty, mismatched-length and non-string values', () => {
        assert.equal(secureCompare('', ''), false);
        assert.equal(secureCompare('abc', 'abcd'), false);
        assert.equal(secureCompare(undefined, 'abc'), false);
        assert.equal(secureCompare(['abc'], 'abc'), false);
    });
});

describe('input parsers', () => {
    it('rejects query-operator objects rather than passing them to Mongo', () => {
        assert.equal(toInteger({ $gt: 0 }), null);
        assert.equal(toTrimmedString({ $ne: null }), null);
        assert.equal(parseSearchQuery({ $regex: '.*' }), null);
        assert.equal(isObjectId({ $ne: null }), false);
    });

    it('reads whole numbers from numbers and numeric strings only', () => {
        assert.equal(toInteger(3), 3);
        assert.equal(toInteger('3'), 3);
        assert.equal(toInteger('3.5'), null);
        assert.equal(toInteger('abc'), null);
        assert.equal(toInteger(''), null);
        assert.equal(toInteger(NaN), null);
    });

    it('recognises only a 24-character hex id', () => {
        assert.equal(isObjectId('507f1f77bcf86cd799439011'), true);
        assert.equal(isObjectId('507f1f77bcf86cd79943901'), false);
        assert.equal(isObjectId('zzzf1f77bcf86cd799439011'), false);
    });

    it('escapes regular-expression metacharacters', () => {
        const pattern = new RegExp(escapeRegex('a(b'), 'i');

        assert.equal(pattern.test('a(b'), true);
        assert.equal(pattern.test('ab'), false);
    });

    it('validates email shape and length', () => {
        assert.equal(isValidEmail('someone@example.com'), true);
        assert.equal(isValidEmail('someone@example'), false);
        assert.equal(isValidEmail('a'.repeat(250) + '@example.com'), false);
    });
});

describe('cart validators', () => {
    it('accepts a quantity inside the allowed range', () => {
        assert.equal(parseQuantity(1), 1);
        assert.equal(parseQuantity('7'), 7);
    });

    it('refuses a quantity outside it', () => {
        assert.throws(() => parseQuantity(0));
        assert.throws(() => parseQuantity(101));
        assert.throws(() => parseQuantity('abc'));
        assert.throws(() => parseQuantity({ $gt: 0 }));
    });

    it('refuses a zero or oversized quantity change', () => {
        assert.equal(parseQuantityChange(-1), -1);
        assert.throws(() => parseQuantityChange(0));
        assert.throws(() => parseQuantityChange(1000));
    });

    it('accepts only a delivery option the server offers', () => {
        assert.equal(parseDeliveryOptionId('1'), '1');
        assert.throws(() => parseDeliveryOptionId('99'));
        assert.throws(() => parseDeliveryOptionId(1));
    });
});

describe('user validators', () => {
    it('accepts a well-formed registration and lower-cases the email', () => {
        const result = validateRegistration({
            name: 'Ada Lovelace',
            email: 'Ada@Example.com',
            password: 'correct-horse',
            confirmPassword: 'correct-horse'
        });

        assert.equal(result.error, null);
        assert.equal(result.credentials.email, 'ada@example.com');
    });

    it('never echoes the password back to the form', () => {
        const result = validateRegistration({
            name: 'A',
            email: 'ada@example.com',
            password: 'short',
            confirmPassword: 'other'
        });

        assert.ok(result.error);
        assert.equal(result.values.password, undefined);
    });

    it('rejects mismatched passwords', () => {
        const result = validateRegistration({
            name: 'Ada Lovelace',
            email: 'ada@example.com',
            password: 'correct-horse',
            confirmPassword: 'correct-horsf'
        });

        assert.equal(result.error, 'Passwords do not match.');
    });

    it('does not reveal whether an address exists on sign-in', () => {
        const result = validateLogin({
            email: 'ada@example.com',
            password: 'x'.repeat(200)
        });

        assert.equal(result.error, 'Incorrect email or password.');
    });
});

describe('delivery options', () => {
    it('throws on an unknown option instead of shipping for free', () => {
        assert.equal(findDeliveryOption('99'), null);
        assert.throws(() => getDeliveryOption('99'));
    });

    it('skips weekends when estimating a delivery date', () => {
        // Friday 6 June 2025, midday, so the local date cannot slip.
        const friday = new Date(2025, 5, 6, 12, 0, 0);

        const oneBusinessDay = deliveryOptions.find(
            (option) => option.deliveryDays === 1
        );

        const delivery = calculateDeliveryDate(oneBusinessDay, friday);

        // Monday, not Saturday.
        assert.equal(delivery.getDay(), 1);
    });
});

describe('pricing', () => {
    const cart = {
        items: [
            {
                product: { priceCents: 1090 },
                quantity: 2,
                deliveryOptionId: '1'
            },
            {
                product: { priceCents: 2095 },
                quantity: 1,
                deliveryOptionId: '2'
            }
        ]
    };

    it('adds up subtotal, shipping, tax and total in whole cents', () => {
        const totals = calculateTotals(cart);

        assert.equal(totals.subtotalCents, 1090 * 2 + 2095);
        assert.equal(totals.shippingCents, 0 + 400);
        assert.equal(
            totals.totalBeforeTaxCents,
            totals.subtotalCents + totals.shippingCents
        );
        assert.equal(
            totals.taxCents,
            Math.round(totals.totalBeforeTaxCents * TAX_RATE)
        );
        assert.equal(
            totals.totalCents,
            totals.totalBeforeTaxCents + totals.taxCents
        );
    });

    it('is safe on an empty or missing cart', () => {
        assert.equal(calculateTotals(null).totalCents, 0);
        assert.equal(calculateTotals({ items: [] }).totalCents, 0);
    });

    it('prices a line from the stored price, never the request', () => {
        assert.equal(
            lineTotalCents({ product: { priceCents: 1090 }, quantity: 3 }),
            3270
        );
    });
});
