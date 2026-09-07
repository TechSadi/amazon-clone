/**
 * Guards against open redirects.
 *
 * Only a path on this site is ever accepted. A value starting with `//`
 * is rejected because the browser reads it as a protocol-relative URL
 * pointing at another host.
 */
export function safeReturnTo(candidate, fallback = '/products') {
    if (
        typeof candidate === 'string' &&
        candidate.startsWith('/') &&
        !candidate.startsWith('//')
    ) {
        return candidate;
    }

    return fallback;
}
