import mongoose from 'mongoose';

import config from '../config/env.js';
import { AppError, notFound } from '../utils/errors.js';

const DEFAULT_MESSAGES = {
    400: 'That request was not valid.',
    401: 'Please sign in to continue.',
    403: 'You are not allowed to do that.',
    404: 'We could not find that page.',
    409: 'That request conflicts with the current state of your account.',
    422: 'Some of the information provided was not valid.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'Something went wrong on our end. Please try again.'
};

const TITLES = {
    401: 'Sign in required',
    403: 'Not allowed',
    404: 'Page not found',
    429: 'Slow down'
};

/**
 * Marks a route as answering with JSON.
 *
 * The browser scripts call these endpoints with fetch and read
 * `response.json()`, so errors have to arrive as JSON too. Without this
 * an expired session returned a redirect to an HTML page and the script
 * failed on a parse error it could not explain.
 */
export const expectsJson = (req, res, next) => {
    req.wantsJson = true;
    next();
};

function prefersJson(req) {
    if (req.wantsJson) {
        return true;
    }

    const accept = req.get('accept') || '';

    return (
        accept.includes('application/json') && !accept.includes('text/html')
    );
}

/**
 * Translates anything thrown anywhere in the app into a status code and
 * a message that is safe to show.
 */
function normalise(error) {
    if (error instanceof AppError) {
        return {
            statusCode: error.statusCode,
            message: error.message,
            code: error.code,
            exposed: true
        };
    }

    if (error instanceof mongoose.Error.CastError) {
        return {
            statusCode: 400,
            message: DEFAULT_MESSAGES[400],
            exposed: true
        };
    }

    if (error instanceof mongoose.Error.ValidationError) {
        return {
            statusCode: 422,
            message: DEFAULT_MESSAGES[422],
            exposed: true
        };
    }

    if (error?.code === 11000) {
        return {
            statusCode: 409,
            message: DEFAULT_MESSAGES[409],
            exposed: true
        };
    }

    // express-rate-limit and body parsers set a status on their errors.
    const statusCode = Number(error?.statusCode || error?.status);

    if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 500) {
        return {
            statusCode,
            message: DEFAULT_MESSAGES[statusCode] || DEFAULT_MESSAGES[400],
            exposed: true
        };
    }

    return {
        statusCode: 500,
        message: DEFAULT_MESSAGES[500],
        exposed: false
    };
}

/** Anything that reaches here matched no route. */
export const notFoundHandler = (req, res, next) => {
    next(notFound('We could not find that page.'));
};

// eslint-disable-next-line no-unused-vars -- Express needs all four.
export const errorHandler = (error, req, res, next) => {
    const { statusCode, message, code } = normalise(error);

    if (statusCode >= 500) {
        // Full detail stays in the server log and never goes to the
        // client.
        console.error(
            `[${req.method} ${req.originalUrl}] ${error?.stack || error}`
        );
    }

    if (res.headersSent) {
        return next(error);
    }

    res.status(statusCode);

    if (prefersJson(req)) {
        return res.json({
            error: {
                status: statusCode,
                message,
                ...(code ? { code } : {})
            }
        });
    }

    res.render(
        'error',
        {
            status: statusCode,
            title: TITLES[statusCode] || 'Something went wrong',
            message,
            // Only ever populated outside production.
            detail: config.isProduction ? null : error?.stack || String(error)
        },
        (renderError, html) => {
            if (renderError) {
                console.error('Error page failed to render:', renderError);

                return res.type('text/plain').send(message);
            }

            res.send(html);
        }
    );
};
