import { isValidEmail, toTrimmedString } from '../utils/validation.js';

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 100;
export const PASSWORD_MIN_LENGTH = 8;
// bcrypt only reads the first 72 bytes, so there is no point accepting
// more and pretending the extra characters are protecting anything.
export const PASSWORD_MAX_LENGTH = 64;

/**
 * Validates a registration form.
 *
 * Returns `{ error, values }`. `values` is always safe to hand back to
 * the template so the customer does not have to retype everything, and
 * never contains the password.
 */
export function validateRegistration(body = {}) {
    const name = toTrimmedString(body.name, { maxLength: 200 });
    const email = toTrimmedString(body.email, { maxLength: 254 });
    const password =
        typeof body.password === 'string' ? body.password : null;
    const confirmPassword =
        typeof body.confirmPassword === 'string'
            ? body.confirmPassword
            : null;

    const values = { name: name ?? '', email: email ?? '' };

    if (!name || !email || !password || !confirmPassword) {
        return { error: 'Please fill in all fields.', values };
    }

    if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
        return {
            error: `Your name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters.`,
            values
        };
    }

    if (!isValidEmail(email)) {
        return { error: 'Please enter a valid email address.', values };
    }

    if (
        password.length < PASSWORD_MIN_LENGTH ||
        password.length > PASSWORD_MAX_LENGTH
    ) {
        return {
            error: `Your password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`,
            values
        };
    }

    if (password !== confirmPassword) {
        return { error: 'Passwords do not match.', values };
    }

    return {
        error: null,
        values,
        credentials: {
            name,
            email: email.toLowerCase(),
            password
        }
    };
}

export function validateLogin(body = {}) {
    const email = toTrimmedString(body.email, { maxLength: 254 });
    const password =
        typeof body.password === 'string' ? body.password : null;

    const values = { email: email ?? '' };

    if (!email || !password) {
        return {
            error: 'Please enter your email and password.',
            values
        };
    }

    // Deliberately not validated against the registration rules: an
    // account created under older rules must still be able to sign in,
    // and a format complaint here would leak which addresses exist.
    if (password.length > PASSWORD_MAX_LENGTH) {
        return { error: 'Incorrect email or password.', values };
    }

    return {
        error: null,
        values,
        credentials: { email: email.toLowerCase(), password }
    };
}
