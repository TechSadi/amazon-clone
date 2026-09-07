/**
 * Errors that are safe to show to the client.
 *
 * Anything thrown that is NOT an AppError is treated as an internal
 * fault by the error handler: it is logged in full and replaced with a
 * generic message so implementation details never reach the browser.
 */
export class AppError extends Error {
    constructor(message, statusCode = 500, code) {
        super(message);

        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;

        Error.captureStackTrace?.(this, AppError);
    }
}

export const badRequest = (message, code) =>
    new AppError(message, 400, code);

export const unauthorized = (
    message = 'You need to sign in to continue.',
    code
) => new AppError(message, 401, code);

export const forbidden = (
    message = 'You are not allowed to do that.',
    code
) => new AppError(message, 403, code);

export const notFound = (message = 'Page not found.', code) =>
    new AppError(message, 404, code);

export const conflict = (message, code) => new AppError(message, 409, code);
