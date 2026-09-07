import path from 'path';
import { fileURLToPath } from 'url';

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

import { attachCurrentUser } from './middleware/auth.js';
import { csrfProtection } from './middleware/csrf.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
        // Cross-origin isolation is not needed here and blocks the
        // Google Fonts stylesheet.
        crossOriginEmbedderPolicy: false
    })
);

// Static assets are served before the session and rate-limit middleware
// so that images, CSS and scripts never touch the session store.
app.use(
    express.static(path.join(__dirname, 'public'), {
        maxAge: config.isProduction ? '7d' : 0,
        etag: true
    })
);

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

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.port, () => {
    console.log(
        `Server listening on port ${config.port} in ${config.nodeEnv} mode`
    );
});

const shutdown = (signal) => async () => {
    console.log(`${signal} received, shutting down.`);

    server.close(async () => {
        await disconnectDB();
        process.exit(0);
    });

    // Do not hang forever on a stuck connection.
    setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', shutdown('SIGTERM'));
process.on('SIGINT', shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
});

export default app;
