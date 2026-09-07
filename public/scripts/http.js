/**
 * The single place the browser talks to this site's JSON endpoints.
 *
 * It attaches the CSRF token, asks for JSON so errors come back as JSON
 * rather than as an HTML page, and turns a failed response into a
 * thrown Error carrying the server's message.
 *
 * Returns null when the visitor is no longer signed in, after sending
 * them to the sign-in page. Callers should stop when they get null.
 */
window.apiFetch = async function apiFetch(url, { method = 'GET', body } = {}) {
    const tokenMeta = document.querySelector('meta[name="csrf-token"]');

    const headers = {
        Accept: 'application/json',
        'X-CSRF-Token': tokenMeta ? tokenMeta.content : ''
    };

    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        method,
        headers,
        credentials: 'same-origin',
        body: body === undefined ? undefined : JSON.stringify(body)
    });

    if (response.status === 401) {
        window.location.href = '/users/login';
        return null;
    }

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const error = new Error(
            (data && data.error && data.error.message) ||
                'Something went wrong. Please try again.'
        );

        error.status = response.status;

        throw error;
    }

    return data;
};

/** Updates every place the header shows a cart count. */
window.setCartQuantity = function setCartQuantity(quantity) {
    document.querySelectorAll('.js-cart-quantity').forEach((element) => {
        element.textContent = quantity;
    });
};
