/**
 * Checkout page behaviour.
 *
 * The summary and the place-order button only exist when the cart has
 * items, so every lookup is guarded.
 */
(function () {
    'use strict';

    var App = window.App;

    // Rendered by the server so the client and the model cannot drift.
    var list = App.$('.js-checkout-list');

    var MAX_QUANTITY = list ? Number(list.dataset.maxQuantity) || 100 : 100;

    /** Applies one server response to the whole order summary. */
    function applySummary(data) {
        if (data.cartQuantity !== undefined) {
            App.setCartQuantity(data.cartQuantity);
        }

        var money = {
            '.js-subtotal': data.subtotal,
            '.js-shipping': data.totalShippingCost,
            '.js-total-before-tax': data.totalBeforeTax,
            '.js-estimated-tax': data.estimatedTax,
            '.js-order-total': data.orderTotal
        };

        Object.keys(money).forEach(function (selector) {
            if (money[selector] === undefined) {
                return;
            }

            App.$$(selector).forEach(function (element) {
                element.textContent = '$' + money[selector];
            });
        });
    }

    function itemCard(productId) {
        return App.$(
            '.js-checkout-item[data-product-id="' + productId + '"]'
        );
    }

    function inCard(productId, selector) {
        var card = itemCard(productId);

        return card ? App.$$(selector, card) : [];
    }

    function syncStepperBounds(productId, quantity) {
        inCard(productId, '.js-decrease').forEach(function (button) {
            button.disabled = quantity <= 1;
        });

        inCard(productId, '.js-increase').forEach(function (button) {
            button.disabled = quantity >= MAX_QUANTITY;
        });
    }

    function currentQuantity(productId) {
        var element = inCard(productId, '.js-quantity')[0];
        var quantity = element ? Number(element.textContent) : 1;

        return Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
    }

    /* ----------------------------------------------------------------
       Quantity

       The endpoint takes an absolute quantity, so the stepper sends the
       value it wants rather than a delta.
       ---------------------------------------------------------------- */

    App.$$('.js-increase, .js-decrease').forEach(function (button) {
        button.addEventListener('click', async function () {
            var productId = button.dataset.productId;
            var card = itemCard(productId);

            var newQuantity =
                currentQuantity(productId) +
                (button.classList.contains('js-increase') ? 1 : -1);

            if (newQuantity < 1 || newQuantity > MAX_QUANTITY) {
                return;
            }

            inCard(productId, '.stepper__button').forEach(function (element) {
                element.disabled = true;
            });

            if (card) {
                card.classList.add('is-busy');
            }

            try {
                var data = await App.api('/checkout/' + productId, {
                    method: 'PATCH',
                    body: { newQuantity: newQuantity }
                });

                if (!data) {
                    return;
                }

                inCard(productId, '.js-quantity').forEach(function (element) {
                    element.textContent = data.itemQuantity;
                });

                inCard(productId, '.js-item-price').forEach(function (element) {
                    element.textContent = '$' + data.cartItemPrice;
                });

                applySummary(data);
                syncStepperBounds(productId, data.itemQuantity);
            } catch (error) {
                App.toast({ message: error.message, type: 'error' });
                syncStepperBounds(productId, currentQuantity(productId));
            } finally {
                if (card) {
                    card.classList.remove('is-busy');
                }
            }
        });
    });

    /* ----------------------------------------------------------------
       Removal
       ---------------------------------------------------------------- */

    App.$$('.js-remove-item').forEach(function (button) {
        button.addEventListener('click', async function () {
            var productId = button.dataset.productId;
            var name = button.dataset.productName || 'Item';

            var data = await App.submit(button, function () {
                return App.api('/checkout/' + productId, {
                    method: 'DELETE'
                });
            });

            if (!data) {
                return;
            }

            // The summary and the place-order button are gone once the
            // cart is empty, so re-render from the server.
            if (data.cartQuantity === 0) {
                window.location.reload();
                return;
            }

            var card = itemCard(productId);

            if (card && card.parentNode) {
                card.parentNode.removeChild(card);
            }

            applySummary(data);

            App.toast({
                message: name + ' removed from your order',
                type: 'info'
            });
        });
    });

    /* ----------------------------------------------------------------
       Delivery option
       ---------------------------------------------------------------- */

    App.$$('.js-delivery-option').forEach(function (input) {
        input.addEventListener('change', async function () {
            var productId = input.dataset.productId;

            // Remembered so the choice can be put back if the server
            // refuses it.
            var previous = App.$$(
                '.js-delivery-option[data-product-id="' + productId + '"]'
            ).filter(function (candidate) {
                return candidate.dataset.wasChecked === 'true';
            })[0];

            try {
                var data = await App.api(
                    '/checkout/' + productId + '/delivery-option',
                    {
                        method: 'PATCH',
                        body: { deliveryOptionId: input.value }
                    }
                );

                if (!data) {
                    return;
                }

                applySummary(data);

                inCard(productId, '.js-delivery-date').forEach(
                    function (element) {
                        element.textContent =
                            'Delivery date: ' + data.deliveryDate;
                    }
                );

                markChecked(productId, input);
            } catch (error) {
                App.toast({ message: error.message, type: 'error' });

                if (previous) {
                    previous.checked = true;
                }
            }
        });
    });

    function markChecked(productId, input) {
        App.$$(
            '.js-delivery-option[data-product-id="' + productId + '"]'
        ).forEach(function (candidate) {
            candidate.dataset.wasChecked =
                candidate === input ? 'true' : 'false';
        });
    }

    // Record what the server rendered as selected.
    App.$$('.js-delivery-option').forEach(function (input) {
        input.dataset.wasChecked = input.checked ? 'true' : 'false';
    });

    /* ----------------------------------------------------------------
       Place the order
       ---------------------------------------------------------------- */

    var placeOrderButton = App.$('.js-place-order');
    var orderOverlay = App.$('.js-order-overlay');

    if (placeOrderButton) {
        placeOrderButton.addEventListener('click', async function () {
            if (placeOrderButton.disabled) {
                return;
            }

            var data = await App.submit(placeOrderButton, function () {
                return App.api('/checkout/place-order', { method: 'POST' });
            });

            if (!data) {
                return;
            }

            // Stays disabled from here on: the order exists, and the
            // page is about to be replaced.
            placeOrderButton.disabled = true;

            if (orderOverlay) {
                orderOverlay.classList.add('is-active');
            }

            window.setTimeout(function () {
                window.location.href = '/orders';
                // Long enough for the confirmation to finish drawing, and
                // no longer. The order already exists at this point.
            }, 900);
        });
    }
})();
