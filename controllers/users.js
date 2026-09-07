import * as userService from '../services/userService.js';
import {
    validateLogin,
    validateRegistration
} from '../validators/userValidator.js';
import { AppError } from '../utils/errors.js';

export const loadLogin = (req, res) => {
    res.render('users/login', { error: null, formData: {} });
};

export const loadRegister = (req, res) => {
    res.render('users/register', { error: null, formData: {} });
};

export const registerUser = async (req, res) => {
    const { error, values, credentials } = validateRegistration(req.body);

    if (error) {
        return res
            .status(400)
            .render('users/register', { error, formData: values });
    }

    try {
        await userService.registerUser(credentials);
    } catch (registrationError) {
        if (isClientError(registrationError)) {
            return res.status(registrationError.statusCode).render(
                'users/register',
                {
                    error: registrationError.message,
                    formData: values
                }
            );
        }

        throw registrationError;
    }

    res.redirect('/users/login');
};

export const loginUser = async (req, res, next) => {
    const { error, values, credentials } = validateLogin(req.body);

    if (error) {
        return res
            .status(400)
            .render('users/login', { error, formData: values });
    }

    let user;

    try {
        user = await userService.authenticate(
            credentials.email,
            credentials.password
        );
    } catch (loginError) {
        if (isClientError(loginError)) {
            return res
                .status(loginError.statusCode)
                .render('users/login', {
                    error: loginError.message,
                    formData: values
                });
        }

        throw loginError;
    }

    const returnTo = safeReturnTo(req.session.returnTo);

    // A brand new session id on sign-in. Without this, a session id
    // planted before login stays valid afterwards (session fixation).
    req.session.regenerate((regenerateError) => {
        if (regenerateError) {
            return next(regenerateError);
        }

        req.session.userId = user.id;
        req.session.user = { name: user.name, email: user.email };

        // Write the session before redirecting, so the very next
        // request is guaranteed to see the signed-in state.
        req.session.save((saveError) => {
            if (saveError) {
                return next(saveError);
            }

            res.redirect(returnTo);
        });
    });
};

export const logoutUser = (req, res, next) => {
    req.session.destroy((error) => {
        if (error) {
            return next(error);
        }

        res.clearCookie(req.app.locals.sessionCookieName);

        res.redirect('/products');
    });
};

function isClientError(error) {
    return (
        error instanceof AppError &&
        error.statusCode >= 400 &&
        error.statusCode < 500
    );
}

/**
 * Only ever returns a path on this site.
 *
 * `returnTo` comes from the URL the visitor was refused, so it has to
 * be treated as untrusted: without this check a link could send someone
 * through our sign-in form and out to an attacker's site.
 */
function safeReturnTo(candidate) {
    if (
        typeof candidate === 'string' &&
        candidate.startsWith('/') &&
        !candidate.startsWith('//')
    ) {
        return candidate;
    }

    return '/products';
}
