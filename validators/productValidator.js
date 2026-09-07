import { toTrimmedString } from '../utils/validation.js';

export const SEARCH_MAX_LENGTH = 100;

/**
 * Normalises the `?q=` search term.
 *
 * Returns null for anything that is not a usable string, including the
 * object Express would produce for `?q[$regex]=...`, so only a plain
 * string ever reaches the product query.
 */
export function parseSearchQuery(value) {
    const term = toTrimmedString(value, { maxLength: SEARCH_MAX_LENGTH });

    return term ? term : null;
}
