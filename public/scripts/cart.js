/**
 * Cart page behaviour.
 *
 * Every element lookup is guarded, because most of this markup only
 * exists when the cart has something in it.
 */
(function () {
    'use strict';

    var App = window.App;

    /** Applies one server response to every total on the page. */
    function applyTotals(data) {
        App.setCartQuantity(data.cartQuantity);

        App.$$('.js-subtotal').forEach(function (element) {
            element.textContent = data.subtotal;
        });
    }

    function itemRow(productId) {
        return App.$('.js-cart-item[data-product-id="' + productId + '"]');
    }

    function inRow(productId, selector) {
        var row = itemRow(productId);

        return row ? App.$$(selector, row) : [];
    }

    /**
     * Keeps the stepper honest about the limits the server enforces, so
     * the visitor is never allowed to ask for something that will be
     * refused.
     */
    function syncStepperBounds(productId, quantity, maximum) {
        inRow(productId, '.js-decrease').forEach(function (button) {
            button.disabled = quantity <= 1;
        });

        inRow(productId, '.js-increase').forEach(function (button) {
            button.disabled = quantity >= maximum;
        });
    }

    // Rendered by the server so the client and the model cannot drift.
    var list = App.$('.js-cart-list');

    var MAX_QUANTITY = list ? Number(list.dataset.maxQuantity) || 100 : 100;

    /* ----------------------------------------------------------------
       Quantity
       ---------------------------------------------------------------- */

    App.$$('.js-increase, .js-decrease').forEach(function (button) {
        button.addEventListener('click', async function () {
            var productId = button.dataset.productId;
            var row = itemRow(productId);
            var stepper = row ? App.$('.js-stepper', row) : null;

            var change = button.classList.contains('js-increase') ? 1 : -1;

            // Both buttons are locked for the round trip: a fast double
            // click must not queue two conflicting changes.
            var buttons = inRow(productId, '.stepper__button');

            buttons.forEach(function (element) {
                element.disabled = true;
            });

            if (stepper) {
                stepper.classList.add('is-busy');
            }

            try {
                var data = await App.api('/cart/' + productId, {
                    method: 'PATCH',
                    body: { quantityChange: change }
                });

                if (!data) {
                    return;
                }

                inRow(productId, '.js-quantity').forEach(function (element) {
                    element.textContent = data.itemQuantity;
                });

                inRow(productId, '.js-item-price').forEach(function (element) {
                    element.textContent = '$' + data.itemPrice;
                });

                applyTotals(data);
                syncStepperBounds(productId, data.itemQuantity, MAX_QUANTITY);
            } catch (error) {
                App.toast({ message: error.message, type: 'error' });

                // The quantity on screen is still the server's last known
                // value, so restore the controls around it.
                var current = Number(
                    (inRow(productId, '.js-quantity')[0] || {}).textContent
                );

                syncStepperBounds(
                    productId,
                    isFinite(current) ? current : 1,
                    MAX_QUANTITY
                );
            } finally {
                if (stepper) {
                    stepper.classList.remove('is-busy');
                }
            }
        });
    });

    /* ----------------------------------------------------------------
       Removal, with undo
       ---------------------------------------------------------------- */

    /** Puts a removed item back and re-renders from the server. */
    async function undoRemoval(productId, quantity) {
        var data = await App.api('/cart/' + productId, {
            method: 'POST',
            body: { quantity: quantity }
        });

        if (!data) {
            return;
        }

        window.location.reload();
    }

    App.$$('.js-remove-item').forEach(function (button) {
        button.addEventListener('click', async function () {
            var productId = button.dataset.productId;
            var name = button.dataset.productName || 'Item';
            var row = itemRow(productId);

            var quantityElement = inRow(productId, '.js-quantity')[0];

            var quantity = quantityElement
                ? Number(quantityElement.textContent)
                : 1;

            var data = await App.submit(button, function () {
                return App.api('/cart/' + productId, { method: 'DELETE' });
            });

            if (!data) {
                return;
            }

            if (row) {
                row.classList.add('is-removing');
            }

            // Nothing is left to update in place, so let the server
            // render the empty state rather than assembling it here.
            if (data.cartQuantity === 0) {
                window.location.reload();
                return;
            }

            applyTotals(data);

            window.setTimeout(function () {
                if (row && row.parentNode) {
                    row.parentNode.removeChild(row);
                }
            }, 320);

            App.toast({
                message: name + ' removed from your cart',
                type: 'info',
                action: {
                    label: 'Undo',
                    onClick: function () {
                        return undoRemoval(productId, quantity);
                    }
                }
            });
        });
    });

    /* ----------------------------------------------------------------
       Checkout
       ---------------------------------------------------------------- */

    var checkoutButton = App.$('.js-checkout-button');
    var checkoutOverlay = App.$('.js-checkout-overlay');

    if (checkoutButton) {
        checkoutButton.addEventListener('click', function () {
            // No artificial pause: the overlay covers the real page load
            // and a second click cannot start a second navigation.
            checkoutButton.disabled = true;

            if (checkoutOverlay) {
                checkoutOverlay.classList.add('is-active');
            }

            window.location.href = '/checkout';
        });
    }
})();
