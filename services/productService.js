import Product from '../models/product.js';
import { notFound } from '../utils/errors.js';
import { escapeRegex } from '../utils/validation.js';

/** Only the fields the listing grid renders. */
const LIST_FIELDS = 'name image priceCents rating';

/**
 * Lists the catalogue, optionally filtered by a search term.
 *
 * The search term is escaped before it becomes a regular expression.
 * Passing it through raw let a visitor inject regex syntax, which could
 * be used to run a catastrophically backtracking pattern against every
 * product name in the collection.
 */
export async function listProducts(searchTerm) {
    if (!searchTerm) {
        return Product.find({}, LIST_FIELDS).lean();
    }

    const pattern = new RegExp(escapeRegex(searchTerm), 'i');

    return Product.find(
        {
            $or: [{ name: pattern }, { keywords: pattern }]
        },
        LIST_FIELDS
    ).lean();
}

export async function getProductById(productId) {
    const product = await Product.findById(productId).lean();

    if (!product) {
        throw notFound('We could not find that product.');
    }

    return product;
}
