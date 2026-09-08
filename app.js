import path from 'path';
import { fileURLToPath } from 'url';

import compression from 'compression';
import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import ejsMate from 'ejs-mate';
import helmet from 'helmet';
import mongoose from 'mongoose';

import config from './config/env.js';
import connectDB, { disconnectDB } from './config/db.js';

import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import checkoutRoutes from './routes/checkout.js';
import ordersRoutes from './routes/orders.js';
import trackingRoutes from './routes/tracking.js';
import userRoutes from './routes/users.js';
import oauthRoutes from './routes/oauth.js';

import { enabledProviders } from './services/oauthService.js';

import { attachCurrentUser } from './middleware/auth.js';
import { csrfProtection } from './middleware/csrf.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { asset, loadAssetHashes } from './utils/assets.js';
import { formatCurrency } from './utils/money.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');

// Hashed asset URLs are computed once, before anything can render.
loadAssetHashes(publicDir);

// The session store shares the Mongoose connection, so the app opens
// one connection to MongoDB rather than two.
try {
    await connectDB();
} catch (error) {
    console.error('Could not connect to MongoDB:', error.message);
    process.exit(1);
}

const app = express();

app.locals.sessionCookieName = config.session.name;

// Templates build every stylesheet and script URL through this, so a
// deployed change is picked up immediately despite the long cache.
app.locals.asset = asset;

// The one place cents become a displayed string. Templates used to do
// their own `(cents / 100).toFixed(2)` in eight places, which is both a
// duplicate of this and unguarded: a missing price rendered as "NaN".
app.locals.money = formatCurrency;

// Which social buttons the sign-in and sign-up pages should show. This
// is fixed at boot by the configured credentials, so a provider without
// credentials never renders a button that cannot work.
app.locals.socialProviders = enabledProviders();

// Required for `secure` cookies and correct client IPs behind a proxy
// such as Render, Heroku or nginx.
if (config.session.trustProxy) {
    app.set('trust proxy', 1);
}

app.disable('x-powered-by');

app.set('views', path.join(__dirname, 'views'));
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');

app.use(
    helmet({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", 'https://fonts.googleapis.com'],
                fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                imgSrc: ["'self'", 'data:'],
                connectSrc: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                // Would break plain-HTTP local development.
                upgradeInsecureRequests: config.isProduction ? [] : null
            }
        },
        // Matches the CSP above. Helmet's default is SAMEORIGIN,
        // which would tell an older browser something less strict than
        // frame-ancestors 'none' tells a current one.
        frameguard: { action: 'deny' },

        // Cross-origin isolation is not needed here and blocks the
        // Google Fonts stylesheet.
        crossOriginEmbedderPolicy: false
    })
);

// Compresses HTML, CSS, JSON and JavaScript on the way out. The
// product listing alone is around 150 kB of markup uncompressed, so
// this is the single largest saving available on a page load.
app.use(compression());

// Static assets are served before the session and rate-limit middleware
// so that images, CSS and scripts never touch the session store.
app.use(
    express.static(publicDir, {
        etag: true,
        lastModified: true,
        setHeaders(res) {
            if (!config.isProduction) {
                // A cached stylesheet during development is a bug
                // hunt that does not need to happen.
                res.setHeader('Cache-Control', 'no-cache');
                return;
            }

            // A URL carrying ?v=<hash> cannot go stale, because a
            // changed file is served under a different URL. Everything
            // else - product images, icons, logos - is content that is
            // replaced by name rather than edited in place.
            res.setHeader(
                'Cache-Control',
                res.req.query.v
                    ? 'public, max-age=31536000, immutable'
                    : 'public, max-age=604800'
            );
        }
    })
);

/**
 * Liveness and readiness for the hosting platform's health check.
 *
 * Deliberately ahead of the session and rate-limit middleware: a probe
 * must not create a session document, and must not be throttled.
 */
app.get('/healthz', (req, res) => {
    const isDatabaseReady = mongoose.connection.readyState === 1;

    res.status(isDatabaseReady ? 200 : 503)
        .set('Cache-Control', 'no-store')
        .json({
            status: isDatabaseReady ? 'ok' : 'degraded',
            database: isDatabaseReady ? 'connected' : 'disconnected',
            uptimeSeconds: Math.round(process.uptime())
        });
});

// Everything past this point is generated per visitor: it carries the
// signed-in name, the cart count and a CSRF token, so it must never be
// held in a shared cache. `no-cache` still permits an ETag
// revalidation, which keeps the 304s.
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-cache');

    // Appended rather than assigned, so the compression middleware's
    // own Vary: Accept-Encoding survives.
    res.vary('Cookie');

    // This site asks for none of these. Saying so explicitly means a
    // script that somehow got onto the page still could not reach them.
    res.setHeader(
        'Permissions-Policy',
        'geolocation=(), camera=(), microphone=(), payment=(), usb=()'
    );

    next();
});

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

app.use(
    session({
        name: config.session.name,
        secret: config.session.secret,
        resave: false,
        saveUninitialized: false,
        // Each request extends the window, so an active customer is not
        // signed out mid-checkout.
        rolling: true,
        store: MongoStore.create({
            client: mongoose.connection.getClient(),
            ttl: config.session.maxAgeMs / 1000,
            touchAfter: 24 * 3600
        }),
        cookie: {
            httpOnly: true,
            sameSite: 'lax',
            secure: config.isProduction,
            maxAge: config.session.maxAgeMs
        }
    })
);

app.use(generalLimiter);
app.use(csrfProtection);
app.use(attachCurrentUser);

app.get('/', (req, res) => res.redirect('/products'));

app.use('/products', productRoutes);
app.use('/cart', cartRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/orders', ordersRoutes);
app.use('/tracking', trackingRoutes);
app.use('/users', userRoutes);
app.use('/auth', oauthRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.port, () => {
    console.log(
        `Server listening on port ${config.port} in ${config.nodeEnv} mode`
    );
});

/**
 * Graceful shutdown.
 *
 * Stops accepting new connections, lets in-flight requests finish, then
 * closes MongoDB. A second signal, or a request that will not end, is
 * not allowed to keep the process alive indefinitely: the platform will
 * SIGKILL us anyway, and exiting on our own terms closes the database
 * connection cleanly.
 */
const SHUTDOWN_TIMEOUT_MS = 10000;

let isShuttingDown = false;

async function shutdown(signal, exitCode = 0) {
    if (isShuttingDown) {
        return;
    }

    isShuttingDown = true;

    console.log(`${signal} received, shutting down.`);

    const forceExit = setTimeout(() => {
        console.error('Shutdown timed out. Exiting immediately.');
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    forceExit.unref();

    try {
        await new Promise((resolve) => {
            server.close(resolve);
            // Idle keep-alive sockets would otherwise hold the server
            // open until their timeout expires.
            server.closeIdleConnections?.();
        });

        await disconnectDB();
    } catch (error) {
        console.error('Error during shutdown:', error?.message || error);
        exitCode = exitCode || 1;
    }

    clearTimeout(forceExit);

    process.exit(exitCode);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

/**
 * A rejected promise nobody handled means a request path we did not
 * think through. It is logged rather than fatal, because the error
 * handler already turns anything thrown inside a route into a 500 and
 * killing the process would take every other in-flight request with it.
 */
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
});

/**
 * An uncaught exception leaves the process in an unknown state, so the
 * only safe response is to stop taking new work and exit. The platform
 * restarts us.
 */
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error?.stack || error);

    shutdown('uncaughtException', 1);
});

export default app;
