/**
 * Primitive input parsers.
 *
 * Every one of these rejects non-primitive input. That is what keeps
 * query-operator objects (for example `{"$ne": null}` arriving as JSON)
 * from ever reaching a Mongoose query.
 */

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

/** Returns a trimmed string, or null if the value is not a string. */
export function toTrimmedString(value, { maxLength = 1000 } = {}) {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();

    return trimmed.length > maxLength
        ? trimmed.slice(0, maxLength)
        : trimmed;
}

/** Returns a safe integer, or null. Accepts numbers and numeric strings. */
export function toInteger(value) {
    if (typeof value === 'number') {
        return Number.isInteger(value) ? value : null;
    }

    if (typeof value !== 'string' || value.trim() === '') {
        return null;
    }

    const parsed = Number(value);

    return Number.isInteger(parsed) ? parsed : null;
}

/** True only for a 24-character hex string. */
export function isObjectId(value) {
    return typeof value === 'string' && OBJECT_ID_PATTERN.test(value);
}

/** Escapes regular-expression metacharacters in user input. */
export function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
    return (
        typeof value === 'string' &&
        value.length <= 254 &&
        EMAIL_PATTERN.test(value)
    );
}
