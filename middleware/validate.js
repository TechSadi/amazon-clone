import { isObjectId } from '../utils/validation.js';
import { notFound } from '../utils/errors.js';

/**
 * Rejects route parameters that are not real ObjectIds.
 *
 * Without this, `/products/not-an-id` reached Mongoose and threw a
 * CastError from inside the controller. Checking the shape up front
 * keeps the 404 honest and stops malformed ids from ever becoming a
 * query.
 */
export const validateObjectId = (paramName) => (req, res, next) => {
    if (!isObjectId(req.params[paramName])) {
        return next(notFound('We could not find what you were looking for.'));
    }

    next();
};
