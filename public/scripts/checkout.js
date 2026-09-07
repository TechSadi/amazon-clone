/**
 * Checkout page behaviour.
 *
 * The order summary and the place-order button only exist when the cart
 * has items, so every lookup here is guarded.
 */
const MAX_QUANTITY = 100;

function setText(selector, value) {
    const element = document.querySelector(selector);

    if (element) {
        element.textContent = value;
    }
}

/** Applies one server response to the whole order summary. */
function applyOrderSummary(data) {
    if (data.cartQuantity !== undefined) {
        setText('.js-return-to-home-link', `${data.cartQuantity} items`);
        setText(
            '.js-payment-summary-cart-items',
            `Items (${data.cartQuantity}):`
        );
    }

    if (data.subtotal !== undefined) {
        setText('.js-payment-summary-money', `$${data.subtotal}`);
    }

    if (data.totalShippingCost !== undefined) {
        setText('.js-shipping-handling', `$${data.totalShippingCost}`);
    }

    setText('.js-total-before-tax', `$${data.totalBeforeTax}`);
    setText('.js-estimated-tax', `$${data.estimatedTax}`);
    setText('.js-order-total', `$${data.orderTotal}`);
}

document.querySelectorAll('.js-update-quantity-link').forEach((link) => {
    link.addEventListener('click', () => {
        const { productId } = link.dataset;

        const container = document.querySelector(
            `.js-cart-item-container-${productId}`
        );

        if (container) {
            container.classList.add('is-editing-quantity');
        }
    });
});

document.querySelectorAll('.js-save-link').forEach((link) => {
    link.addEventListener('click', async () => {
        const { productId } = link.dataset;

        const container = document.querySelector(
            `.js-cart-item-container-${productId}`
        );

        const quantityInput = document.querySelector(
            `.js-quantity-input-${productId}`
        );

        if (!quantityInput) {
            return;
        }

        const newQuantity = Number(quantityInput.value);

        // The server validates this too; this check just avoids a
        // pointless round trip and gives immediate feedback.
        if (
            !Number.isInteger(newQuantity) ||
            newQuantity < 1 ||
            newQuantity > MAX_QUANTITY
        ) {
            window.alert(
                `Quantity must be a whole number between 1 and ${MAX_QUANTITY}.`
            );
            return;
        }

        try {
            const data = await window.apiFetch(`/checkout/${productId}`, {
                method: 'PATCH',
                body: { newQuantity }
            });

            if (!data) {
                return;
            }

            setText(`.js-quantity-label-${productId}`, data.itemQuantity);
            setText(
                `.js-product-price-${productId}`,
                `$ ${data.cartItemPrice}`
            );

            applyOrderSummary(data);

            if (container) {
                container.classList.remove('is-editing-quantity');
            }
        } catch (error) {
            window.alert(error.message);
        }
    });
});

document.querySelectorAll('.js-delete-link').forEach((link) => {
    link.addEventListener('click', async () => {
        const { productId } = link.dataset;

        try {
            const data = await window.apiFetch(`/checkout/${productId}`, {
                method: 'DELETE'
            });

            if (!data) {
                return;
            }

            const container = document.querySelector(
                `.js-cart-item-container-${productId}`
            );

            if (container) {
                container.remove();
            }

            // The summary and place-order button are gone once the cart
            // is empty, so re-render from the server.
            if (data.cartQuantity === 0) {
                window.location.reload();
                return;
            }

            applyOrderSummary(data);
        } catch (error) {
            window.alert(error.message);
        }
    });
});

document.querySelectorAll('.js-delivery-option').forEach((element) => {
    element.addEventListener('click', async () => {
        const { productId, deliveryOptionId } = element.dataset;

        try {
            const data = await window.apiFetch(
                `/checkout/${productId}/delivery-option`,
                {
                    method: 'PATCH',
                    body: { deliveryOptionId }
                }
            );

            if (!data) {
                return;
            }

            applyOrderSummary(data);

            setText(
                `.js-delivery-date-${productId}`,
                `Delivery date: ${data.deliveryDate}`
            );
        } catch (error) {
            window.alert(error.message);
        }
    });
});

const placeOrderButton = document.querySelector('.js-place-order-button');
const placeOrderText = document.querySelector('.js-place-order-text');
const successOverlay = document.querySelector('.js-order-success-overlay');

if (placeOrderButton) {
    placeOrderButton.addEventListener('click', async () => {
        // Was `.disable`, which is always undefined, so the guard never
        // fired. The button is disabled below and the server refuses a
        // second order for the same cart regardless.
        if (placeOrderButton.disabled) {
            return;
        }

        placeOrderButton.disabled = true;
        placeOrderButton.classList.add('loading');

        if (placeOrderText) {
            placeOrderText.textContent = 'Placing your order...';
        }

        try {
            const data = await window.apiFetch('/checkout/place-order', {
                method: 'POST'
            });

            if (!data) {
                return;
            }

            placeOrderButton.classList.remove('loading');

            if (successOverlay) {
                successOverlay.classList.add('active');
            }

            setTimeout(() => {
                window.location.href = '/orders';
            }, 1500);
        } catch (error) {
            window.alert(error.message);

            placeOrderButton.disabled = false;
            placeOrderButton.classList.remove('loading');

            if (placeOrderText) {
                placeOrderText.textContent = 'Place your order';
            }
        }
    });
}
