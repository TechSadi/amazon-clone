import crypto from 'crypto';

import config from '../config/env.js';
import User from '../models/user.js';
import { AppError, badRequest, conflict } from '../utils/errors.js';

const REQUEST_TIMEOUT_MS = 10000;

/**
 * Social sign-in over the OAuth 2.0 authorization-code flow.
 *
 * Written directly against the providers rather than through Passport:
 * the flow is about sixty shared lines, and Passport would bring its own
 * session serialisation to sit alongside the `req.session.userId` this
 * app already uses.
 *
 * The profile is always read from the provider's own API using the
 * access token, never from an id_token parsed on our side, so there is
 * no signature verification to get wrong.
 */
const PROVIDERS = {
    google: {
        label: 'Google',
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scope: 'openid email profile',
        usesPkce: true,
        authorizeParams: { prompt: 'select_account' },

        async fetchProfile(accessToken) {
            const data = await getJson(
                'https://openidconnect.googleapis.com/v1/userinfo',
                accessToken
            );

            return {
                providerId: String(data.sub || ''),
                email: normaliseEmail(data.email),
                // Google states explicitly whether it verified the
                // address. Anything else is treated as unverified.
                emailVerified: data.email_verified === true,
                name: data.name || data.given_name || ''
            };
        }
    },

    github: {
        label: 'GitHub',
        authorizeUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scope: 'read:user user:email',
        // GitHub OAuth apps do not support PKCE.
        usesPkce: false,
        authorizeParams: {},

        async fetchProfile(accessToken) {
            const [account, emails] = await Promise.all([
                getJson('https://api.github.com/user', accessToken),
                getJson('https://api.github.com/user/emails', accessToken)
            ]);

            // A GitHub profile's public email may be unverified or
            // absent, so the address comes from the emails endpoint,
            // which reports verification per address.
            const primary = Array.isArray(emails)
                ? emails.find((entry) => entry.primary && entry.verified) ||
                  emails.find((entry) => entry.verified)
                : null;

            return {
                providerId: String(account.id || ''),
                email: normaliseEmail(primary && primary.email),
                emailVerified: Boolean(primary),
                name: account.name || account.login || ''
            };
        }
    },

    microsoft: {
        label: 'Microsoft',
        authorizeUrl:
            'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl:
            'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        scope: 'openid email profile User.Read',
        usesPkce: true,
        authorizeParams: { prompt: 'select_account' },

        async fetchProfile(accessToken) {
            const data = await getJson(
                'https://graph.microsoft.com/v1.0/me',
                accessToken
            );

            // Graph exposes no "verified" flag. `mail` is a real mailbox
            // Microsoft controls; a userPrincipalName carrying #EXT# is
            // a guest alias from another tenant and is not treated as
            // proof that this person owns the address.
            const upn = String(data.userPrincipalName || '');
            const email = normaliseEmail(data.mail || upn);

            return {
                providerId: String(data.id || ''),
                email,
                emailVerified: Boolean(email) && !upn.includes('#EXT#'),
                name: data.displayName || ''
            };
        }
    }
};

/** Providers that are both implemented and configured with credentials. */
export function enabledProviders() {
    return Object.entries(PROVIDERS)
        .filter(([name]) => config.oauth[name] && config.oauth[name].enabled)
        .map(([name, provider]) => ({
            name,
            label: provider.label,
            href: `/auth/${name}`
        }));
}

export function isEnabled(name) {
    return Boolean(
        PROVIDERS[name] && config.oauth[name] && config.oauth[name].enabled
    );
}

function getProvider(name) {
    return isEnabled(name) ? PROVIDERS[name] : null;
}

export function redirectUri(name) {
    return `${config.baseUrl}/auth/${name}/callback`;
}

function base64url(buffer) {
    return buffer.toString('base64url');
}

/**
 * Builds the URL the browser is sent to, plus the one-time secrets that
 * have to be remembered on the session to verify the callback.
 */
export function buildAuthorizationRequest(name) {
    const provider = getProvider(name);

    if (!provider) {
        return null;
    }

    const state = base64url(crypto.randomBytes(32));

    const codeVerifier = provider.usesPkce
        ? base64url(crypto.randomBytes(32))
        : null;

    const params = new URLSearchParams({
        client_id: config.oauth[name].clientId,
        redirect_uri: redirectUri(name),
        response_type: 'code',
        scope: provider.scope,
        state,
        ...provider.authorizeParams
    });

    if (codeVerifier) {
        params.set(
            'code_challenge',
            base64url(
                crypto.createHash('sha256').update(codeVerifier).digest()
            )
        );

        params.set('code_challenge_method', 'S256');
    }

    return {
        url: `${provider.authorizeUrl}?${params.toString()}`,
        state,
        codeVerifier
    };
}

async function exchangeCodeForToken(name, code, codeVerifier) {
    const provider = getProvider(name);

    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri(name),
        client_id: config.oauth[name].clientId,
        client_secret: config.oauth[name].clientSecret
    });

    if (codeVerifier) {
        body.set('code_verifier', codeVerifier);
    }

    const response = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json'
        },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });

    const data = await response.json().catch(() => null);

    // The provider's own error text is deliberately not passed on: it
    // can echo the client id and means nothing to a customer.
    if (!response.ok || !data || !data.access_token) {
        throw new AppError(
            'We could not complete that sign-in. Please try again.',
            502
        );
    }

    return data.access_token;
}

async function getJson(url, accessToken) {
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'User-Agent': 'amazon-clone'
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });

    if (!response.ok) {
        throw new AppError(
            'We could not read your profile from that provider.',
            502
        );
    }

    return response.json();
}

function normaliseEmail(value) {
    return typeof value === 'string' && value.includes('@')
        ? value.trim().toLowerCase()
        : '';
}

/**
 * Finds, links or creates the account behind a social profile.
 *
 * Linking by email only ever happens when the provider confirms it
 * verified that address. Without that rule, anyone able to register at
 * a provider using someone else's address could take over the matching
 * account here.
 */
async function resolveUser(name, profile) {
    const alreadyLinked = await User.findOne({
        authProviders: {
            $elemMatch: { provider: name, providerId: profile.providerId }
        }
    }).select('name email');

    if (alreadyLinked) {
        return alreadyLinked;
    }

    const label = PROVIDERS[name].label;

    if (!profile.email) {
        throw badRequest(
            `Your ${label} account did not share an email address. Please add one there, or sign up with an email and password.`
        );
    }

    if (!profile.emailVerified) {
        throw badRequest(
            `${label} has not verified the email address on that account. Please verify it there, or sign up with an email and password.`
        );
    }

    const existing = await User.findOne({ email: profile.email }).select(
        'name email authProviders'
    );

    if (existing) {
        // $addToSet rather than load-modify-save: it is atomic, it
        // cannot duplicate a link if two sign-ins race, and it does not
        // re-validate a document whose password field was never loaded.
        await User.updateOne(
            { _id: existing._id },
            {
                $addToSet: {
                    authProviders: {
                        provider: name,
                        providerId: profile.providerId
                    }
                }
            }
        );

        return existing;
    }

    try {
        return await User.create({
            name: profile.name.trim() || 'Customer',
            email: profile.email,
            authProviders: [{ provider: name, providerId: profile.providerId }]
        });
    } catch (error) {
        // Another request created the same account a moment ago.
        if (error && error.code === 11000) {
            const raced = await User.findOne({
                email: profile.email
            }).select('name email');

            if (raced) {
                return raced;
            }

            throw conflict('An account with this email already exists.');
        }

        throw error;
    }
}

/** Completes the callback: authorization code in, signed-in user out. */
export async function completeSignIn(name, code, codeVerifier) {
    const provider = getProvider(name);

    if (!provider) {
        throw badRequest('That sign-in method is not available.');
    }

    const accessToken = await exchangeCodeForToken(name, code, codeVerifier);

    const profile = await provider.fetchProfile(accessToken);

    if (!profile.providerId) {
        throw new AppError(
            'We could not read your profile from that provider.',
            502
        );
    }

    const user = await resolveUser(name, profile);

    return {
        id: String(user._id),
        name: user.name,
        email: user.email
    };
}
