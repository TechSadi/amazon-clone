import crypto from 'crypto';
import bcrypt from 'bcrypt';

import User from '../models/user.js';
import config from '../config/env.js';
import { conflict, unauthorized } from '../utils/errors.js';

/**
 * A hash of a random throwaway value.
 *
 * Failed logins for unknown addresses are compared against this so the
 * response takes about as long as a real password check. Without it the
 * timing difference tells an attacker which email addresses are
 * registered.
 */
let dummyHashPromise = null;

function getDummyHash() {
    if (!dummyHashPromise) {
        dummyHashPromise = bcrypt.hash(
            crypto.randomBytes(32).toString('hex'),
            config.bcryptRounds
        );
    }

    return dummyHashPromise;
}

export async function registerUser({ name, email, password }) {
    const existing = await User.findOne({ email }).select('_id').lean();

    if (existing) {
        throw conflict('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

    try {
        return await User.create({
            name,
            email,
            password: passwordHash
        });
    } catch (error) {
        // Two simultaneous registrations for the same address: the
        // unique index is the real guard, the lookup above is just a
        // friendlier fast path.
        if (error?.code === 11000) {
            throw conflict('An account with this email already exists.');
        }

        throw error;
    }
}

const PROVIDER_LABELS = {
    google: 'Google',
    github: 'GitHub',
    microsoft: 'Microsoft'
};

export async function authenticate(email, password) {
    const user = await User.findOne({ email }).select(
        '+password name email authProviders'
    );

    if (!user) {
        await bcrypt.compare(password, await getDummyHash());

        throw unauthorized('Incorrect email or password.');
    }

    // An account created through a social provider has no password at
    // all. Saying so is far more useful than "incorrect password" to
    // someone who never chose one, and the registration form already
    // discloses whether an address is taken.
    if (!user.password) {
        const labels = user.authProviders
            .map((entry) => PROVIDER_LABELS[entry.provider])
            .filter(Boolean);

        throw unauthorized(
            labels.length > 0
                ? `This account signs in with ${labels.join(' or ')}. Use the "Continue with ${labels[0]}" button below.`
                : 'Incorrect email or password.'
        );
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
        throw unauthorized('Incorrect email or password.');
    }

    return {
        id: String(user._id),
        name: user.name,
        email: user.email
    };
}

/** Never returns the password hash: the field is `select: false`. */
export async function findPublicUser(userId) {
    return User.findById(userId).select('name email').lean();
}
