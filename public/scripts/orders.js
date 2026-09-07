/**
 * Buy it again.
 *
 * Adds the same quantity that was ordered back to the cart, then offers
 * the cart rather than navigating away from the order history without
 * asking.
 */
(function () {
    'use strict';

    var App = window.App;

    App.$$('.js-buy-again').forEach(function (button) {
        button.addEventListener('click', async function () {
            var productId = button.dataset.productId;
            var quantity = Number(button.dataset.quantity) || 1;
            var name = button.dataset.productName || 'Item';

            var data = await App.submit(button, function () {
                return App.api('/cart/' + productId, {
                    method: 'POST',
                    body: { quantity: quantity }
                });
            });

            if (!data) {
                return;
            }

            App.setCartQuantity(data.cartQuantity);

            App.toast({
                message: name + ' added to your cart',
                type: 'success',
                action: {
                    label: 'View cart',
                    onClick: function () {
                        window.location.href = '/cart';
                    }
                }
            });
        });
    });
})();
