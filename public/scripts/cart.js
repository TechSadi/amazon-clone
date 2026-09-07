/**
 * Cart page behaviour.
 *
 * Every element lookup is guarded: most of this markup only exists when
 * the cart has something in it, and the previous version threw on an
 * empty cart before any handler was attached, which silently disabled
 * the rest of the page's scripts.
 */
const cartToast = document.querySelector('.js-cart-toast');
const cartToastMessage = document.querySelector('.js-cart-toast-message');
const undoButton = document.querySelector('.js-undo-button');

let toastTimeout;
let deletedItem = null;

function setText(selector, value) {
    const element = document.querySelector(selector);

    if (element) {
        element.textContent = value;
    }
}

/** Applies one server response to every total on the page. */
function applyCartTotals(data) {
    window.setCartQuantity(data.cartQuantity);

    setText('.js-bottom-cart-quantity', data.cartQuantity);
    setText('.js-right-cart-quantity', data.cartQuantity);
    setText('.js-bottom-subtotal', data.subtotal);
    setText('.js-right-subtotal', data.subtotal);
}

function showCartToast(message) {
    if (!cartToast || !cartToastMessage) {
        return;
    }

    clearTimeout(toastTimeout);

    if (undoButton) {
        undoButton.disabled = false;
    }

    cartToastMessage.textContent = message;
    cartToast.classList.add('show');

    toastTimeout = setTimeout(() => {
        cartToast.classList.remove('show');
        deletedItem = null;
    }, 5000);
}

function hideCartToast() {
    clearTimeout(toastTimeout);

    if (cartToast) {
        cartToast.classList.remove('show');
    }

    deletedItem = null;
}

document
    .querySelectorAll('.js-increase-button, .js-decrease-button')
    .forEach((button) => {
        button.addEventListener('click', async () => {
            const { productId } = button.dataset;

            const quantityChange = button.classList.contains(
                'js-increase-button'
            )
                ? 1
                : -1;

            button.disabled = true;

            try {
                const data = await window.apiFetch(`/cart/${productId}`, {
                    method: 'PATCH',
                    body: { quantityChange }
                });

                if (!data) {
                    return;
                }

                setText(`.js-quantity-${productId}`, data.itemQuantity);
                applyCartTotals(data);
            } catch (error) {
                window.alert(error.message);
            } finally {
                button.disabled = false;
            }
        });
    });

document.querySelectorAll('.js-delete-button').forEach((button) => {
    button.addEventListener('click', async () => {
        const { productId } = button.dataset;

        const cartItem = document.querySelector(
            `.js-cart-item-${productId}`
        );

        const quantityElement = cartItem
            ? cartItem.querySelector(`.js-quantity-${productId}`)
            : null;

        const quantity = quantityElement
            ? Number(quantityElement.textContent)
            : 1;

        button.disabled = true;

        try {
            const data = await window.apiFetch(`/cart/${productId}`, {
                method: 'DELETE'
            });

            if (!data) {
                return;
            }

            deletedItem = { productId, quantity };

            if (cartItem) {
                cartItem.classList.add('removing');
            }

            setTimeout(() => {
                if (cartItem) {
                    cartItem.remove();
                }

                // Nothing left to update in place, so re-render the
                // empty-cart state from the server.
                if (data.cartQuantity === 0) {
                    window.location.reload();
                    return;
                }

                applyCartTotals(data);
                showCartToast('Item removed from your cart');
            }, 300);
        } catch (error) {
            window.alert(error.message);
            button.disabled = false;
        }
    });
});

if (undoButton) {
    undoButton.addEventListener('click', async () => {
        if (!deletedItem) {
            return;
        }

        undoButton.disabled = true;

        const { productId, quantity } = deletedItem;

        try {
            const data = await window.apiFetch(`/cart/${productId}`, {
                method: 'POST',
                body: { quantity }
            });

            if (!data) {
                return;
            }

            hideCartToast();

            window.location.reload();
        } catch (error) {
            window.alert(error.message);
            undoButton.disabled = false;
        }
    });
}

const checkoutButton = document.querySelector('.js-checkout-button');
const checkoutLoadingOverlay = document.querySelector(
    '.js-checkout-loading-overlay'
);

if (checkoutButton) {
    checkoutButton.addEventListener('click', () => {
        checkoutButton.disabled = true;

        if (checkoutLoadingOverlay) {
            checkoutLoadingOverlay.classList.add('active');
        }

        setTimeout(() => {
            window.location.href = '/checkout';
        }, 600);
    });
}
