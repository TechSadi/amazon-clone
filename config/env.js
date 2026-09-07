import dotenv from 'dotenv';

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

/**
 * Reads a required environment variable.
 * Collects problems instead of throwing so the operator sees every
 * missing value at once rather than one per restart.
 */
const problems = [];

function required(key) {
    const value = process.env[key];

    if (!value || !value.trim()) {
        problems.push(`${key} is missing`);
        return '';
    }

    return value.trim();
}

function optional(key) {
    const value = process.env[key];

    return value && value.trim() ? value.trim() : '';
}

const mongoUri = required('MONGO_URI');
const sessionSecret = required('SESSION_SECRET');

if (IS_PRODUCTION && sessionSecret && sessionSecret.length < 32) {
    problems.push(
        'SESSION_SECRET must be at least 32 characters in production'
    );
}

const port = Number(process.env.PORT || 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
    problems.push('PORT must be an integer between 1 and 65535');
}

const bcryptRounds = Number(process.env.BCRYPT_ROUNDS || 12);

if (!Number.isInteger(bcryptRounds) || bcryptRounds < 10 || bcryptRounds > 15) {
    problems.push('BCRYPT_ROUNDS must be an integer between 10 and 15');
}

/**
 * Social sign-in.
 *
 * Every provider is optional: the app runs perfectly well with none of
 * them set, and a provider whose credentials are absent simply does not
 * appear on the sign-in page. Configuring only half of a pair is
 * treated as a mistake rather than silently ignored.
 */
const OAUTH_PROVIDER_NAMES = ['google', 'github', 'microsoft'];

const oauth = {};

OAUTH_PROVIDER_NAMES.forEach((name) => {
    const key = name.toUpperCase();

    const clientId = optional(`${key}_CLIENT_ID`);
    const clientSecret = optional(`${key}_CLIENT_SECRET`);

    if (Boolean(clientId) !== Boolean(clientSecret)) {
        problems.push(
            `${key}_CLIENT_ID and ${key}_CLIENT_SECRET must both be set, or both be left empty`
        );
    }

    oauth[name] = Object.freeze({
        clientId,
        clientSecret,
        enabled: Boolean(clientId && clientSecret)
    });
});

const anyOauthEnabled = OAUTH_PROVIDER_NAMES.some(
    (name) => oauth[name].enabled
);

const baseUrl = (
    optional('BASE_URL') || `http://localhost:${port}`
).replace(/\/+$/, '');

// The redirect URI registered with each provider is absolute, so in
// production it cannot be guessed from the request.
if (anyOauthEnabled && IS_PRODUCTION && !optional('BASE_URL')) {
    problems.push(
        'BASE_URL must be set in production when social sign-in is enabled'
    );
}

if (problems.length > 0) {
    console.error('Configuration error. The application cannot start:');

    problems.forEach((problem) => console.error(`  - ${problem}`));

    console.error('See .env.example for the expected variables.');

    process.exit(1);
}

const config = Object.freeze({
    nodeEnv: NODE_ENV,
    isProduction: IS_PRODUCTION,
    port,
    mongoUri,
    bcryptRounds,
    baseUrl,

    session: Object.freeze({
        secret: sessionSecret,
        name: process.env.SESSION_NAME || 'amazon.sid',
        maxAgeMs: 1000 * 60 * 60 * 24 * 7,
        // Required when running behind a reverse proxy (Render, Heroku,
        // nginx) so secure cookies are not dropped.
        trustProxy: process.env.TRUST_PROXY === 'true' || IS_PRODUCTION
    }),

    oauth: Object.freeze(oauth)
});

export default config;
