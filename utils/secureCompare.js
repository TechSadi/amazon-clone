import crypto from 'crypto';

/**
 * Constant-time string comparison.
 *
 * Used wherever a value supplied by the browser is checked against a
 * secret held on the session (CSRF tokens, OAuth state), so that the
 * time taken to reject a wrong value does not reveal how much of it was
 * correct.
 */
export function secureCompare(submitted, expected) {
    if (
        typeof submitted !== 'string' ||
        typeof expected !== 'string' ||
        submitted.length !== expected.length ||
        expected.length === 0
    ) {
        return false;
    }

    return crypto.timingSafeEqual(
        Buffer.from(submitted),
        Buffer.from(expected)
    );
}
