import crypto from 'crypto';

import { forbidden } from '../utils/errors.js';
import { secureCompare } from '../utils/secureCompare.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Synchroniser-token CSRF protection.
 *
 * A random token is stored on the session and rendered into the page.
 * Forms send it back in a hidden `_csrf` field and fetch calls send it
 * in the `X-CSRF-Token` header. A cross-site page can make the browser
 * issue a request, but it cannot read the token out of our page, so it
 * cannot produce a request that passes this check.
 *
 * Kept as ~40 lines here rather than pulled in as a dependency: the
 * widely used package for this is deprecated and unmaintained.
 */
export const csrfProtection = (req, res, next) => {
    if (!req.session) {
        return next(
            forbidden('Your session is unavailable. Please reload the page.')
        );
    }

    const isSafeMethod = SAFE_METHODS.has(req.method);

    // Minting a token starts a session, and a session is a document in
    // MongoDB plus a Set-Cookie. Only a request that can render a form,
    // or one that changes something, has any use for a token, so a
    // crawler, a health probe or a missing-image 404 no longer leaves a
    // session behind.
    const needsToken =
        !isSafeMethod ||
        (req.get('accept') || '').includes('text/html');

    if (!req.session.csrfToken && needsToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }

    res.locals.csrfToken = req.session.csrfToken || '';

    if (isSafeMethod) {
        return next();
    }

    const submitted =
        req.get('x-csrf-token') ||
        (req.body && typeof req.body._csrf === 'string'
            ? req.body._csrf
            : '');

    if (!secureCompare(submitted, req.session.csrfToken)) {
        return next(
            forbidden(
                'Your session has expired or the request could not be verified. Please reload the page and try again.'
            )
        );
    }

    next();
};

