import * as oauthService from '../services/oauthService.js';
import { AppError, notFound } from '../utils/errors.js';
import { safeReturnTo } from '../utils/redirects.js';
import { secureCompare } from '../utils/secureCompare.js';
import { toTrimmedString } from '../utils/validation.js';

// Where the one-time secrets for an in-flight sign-in are parked.
const FLOW_KEY = 'oauthFlow';

/**
 * Step one: send the browser to the provider.
 *
 * A random `state` is generated and remembered on the session. The
 * provider echoes it back, and the callback refuses to proceed unless it
 * matches, which is what stops an attacker from feeding us an
 * authorization code belonging to their own account.
 */
export const startOAuth = (req, res, next) => {
    const { provider } = req.params;

    if (req.session.userId) {
        return res.redirect('/products');
    }

    const request = oauthService.buildAuthorizationRequest(provider);

    if (!request) {
        return next(notFound('That sign-in method is not available.'));
    }

    req.session[FLOW_KEY] = {
        provider,
        state: request.state,
        codeVerifier: request.codeVerifier,
        returnTo: safeReturnTo(req.session.returnTo)
    };

    // Written before the browser leaves, so the state is certain to be
    // on the session by the time the provider sends it back.
    req.session.save((error) => {
        if (error) {
            return next(error);
        }

        res.redirect(request.url);
    });
};

/**
 * Step two: the provider sends the customer back with a code.
 */
export const oauthCallback = async (req, res, next) => {
    const { provider } = req.params;

    const flow = req.session[FLOW_KEY];

    // One attempt per authorization request, whatever the outcome.
    delete req.session[FLOW_KEY];

    if (toTrimmedString(req.query.error)) {
        // The customer pressed cancel on the provider's consent screen.
        return failSignIn(req, res, 'Sign-in was cancelled.');
    }

    const code = toTrimmedString(req.query.code, { maxLength: 2048 });
    const state = toTrimmedString(req.query.state, { maxLength: 512 });

    if (
        !flow ||
        flow.provider !== provider ||
        !code ||
        !secureCompare(state, flow.state)
    ) {
        return failSignIn(
            req,
            res,
            'That sign-in link could not be verified. Please try again.'
        );
    }

    let user;

    try {
        user = await oauthService.completeSignIn(
            provider,
            code,
            flow.codeVerifier
        );
    } catch (error) {
        // Anything the customer can act on is shown on the sign-in
        // page. Genuine faults go to the central error handler.
        if (
            error instanceof AppError &&
            error.statusCode >= 400 &&
            error.statusCode < 500
        ) {
            return failSignIn(req, res, error.message);
        }

        return next(error);
    }

    const returnTo = safeReturnTo(flow.returnTo);

    // A brand new session id on sign-in, exactly as the password flow
    // does, so a session id planted beforehand cannot survive it.
    req.session.regenerate((regenerateError) => {
        if (regenerateError) {
            return next(regenerateError);
        }

        req.session.userId = user.id;
        req.session.user = { name: user.name, email: user.email };

        req.session.save((saveError) => {
            if (saveError) {
                return next(saveError);
            }

            res.redirect(returnTo);
        });
    });
};

/**
 * Reports a failed sign-in on the sign-in page itself.
 *
 * The message travels on the session rather than in the query string,
 * so nothing an attacker puts in a URL can be reflected onto the page.
 */
function failSignIn(req, res, message) {
    req.session.authError = message;

    res.redirect('/users/login');
}
