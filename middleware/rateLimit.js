import rateLimit from 'express-rate-limit';

import { AppError } from '../utils/errors.js';

/**
 * All limiters hand off to the central error handler so a throttled
 * request gets the same JSON or HTML treatment as any other error.
 */
const handler = (req, res, next) => {
    next(
        new AppError(
            'Too many requests. Please wait a moment and try again.',
            429
        )
    );
};

const base = {
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler
};

/**
 * A backstop for the whole app. Static files are served before this
 * runs, so the budget is spent only on real page and API requests.
 */
export const generalLimiter = rateLimit({
    ...base,
    windowMs: 15 * 60 * 1000,
    limit: 600
});

/**
 * Sign-in and sign-up. Successful sign-ins are not counted, so this
 * costs a legitimate customer nothing while making password guessing
 * impractical.
 */
export const authLimiter = rateLimit({
    ...base,
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true
});

/** Order placement: generous for a person, tight for a script. */
export const orderLimiter = rateLimit({
    ...base,
    windowMs: 60 * 1000,
    limit: 10
});

/** Cart and checkout edits, which a customer can fire quickly. */
export const writeLimiter = rateLimit({
    ...base,
    windowMs: 60 * 1000,
    limit: 120
});
