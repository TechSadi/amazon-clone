import { unauthorized } from '../utils/errors.js';
import * as userService from '../services/userService.js';

/**
 * Puts the signed-in user's display details on `res.locals` for the
 * header partial.
 *
 * Only the name and email are exposed. The previous version assigned
 * the whole Mongoose document, which meant the bcrypt hash was part of
 * the render context of every page.
 *
 * The details are cached on the session, so a signed-in visitor costs
 * no extra query per request.
 */
export const attachCurrentUser = async (req, res, next) => {
    const userId = req.session?.userId;

    if (!userId) {
        res.locals.currentUser = null;
        return next();
    }

    if (!req.session.user) {
        const user = await userService.findPublicUser(userId);

        if (!user) {
            // The account was deleted while the session was still live.
            return req.session.destroy(() => {
                res.locals.currentUser = null;
                next();
            });
        }

        req.session.user = { name: user.name, email: user.email };
    }

    res.locals.currentUser = req.session.user;

    next();
};

/**
 * Gates a route behind a signed-in session.
 *
 * Page requests are redirected to the sign-in form and returned to
 * where they were going afterwards. Requests the error handler will
 * answer with JSON get a 401 instead of a redirect, so the browser
 * script sees a real status rather than a page of HTML.
 */
export const requireLogin = (req, res, next) => {
    if (req.session?.userId) {
        return next();
    }

    if (req.wantsJson) {
        return next(unauthorized('Please sign in to continue.'));
    }

    if (req.method === 'GET' && req.session) {
        req.session.returnTo = req.originalUrl;
    }

    res.redirect('/users/login');
};

/** Keeps signed-in visitors away from the sign-in and sign-up forms. */
export const requireGuest = (req, res, next) => {
    if (req.session?.userId) {
        return res.redirect('/products');
    }

    next();
};
