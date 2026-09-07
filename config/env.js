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

    session: Object.freeze({
        secret: sessionSecret,
        name: process.env.SESSION_NAME || 'amazon.sid',
        maxAgeMs: 1000 * 60 * 60 * 24 * 7,
        // Required when running behind a reverse proxy (Render, Heroku,
        // nginx) so secure cookies are not dropped.
        trustProxy: process.env.TRUST_PROXY === 'true' || IS_PRODUCTION
    })
});

export default config;
