/**
 * Add to cart, shared by the product grid and the product page.
 *
 * The product page used to load a second, near-identical copy of this
 * logic, so every click ran two handlers and posted twice.
 */
(function () {
    'use strict';

    var App = window.App;

    /** The quantity chosen for a product, or 1 where there is no selector. */
    function readQuantity(productId) {
        var select = App.$(
            '.js-quantity-select[data-product-id="' + productId + '"]'
        );

        var quantity = select ? Number(select.value) : 1;

        return Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
    }

    async function addToCart(button, options) {
        var productId = button.dataset.productId;
        var settings = options || {};
        var quantity = readQuantity(productId);

        var data = await App.submit(button, function () {
            return App.api('/cart/' + productId, {
                method: 'POST',
                body: { quantity: quantity }
            });
        });

        // null means the call failed and has already been reported, or
        // the session ended and the browser is on its way to sign-in.
        if (!data) {
            return null;
        }

        App.setCartQuantity(data.cartQuantity);

        return data;
    }

    App.$$('.js-add-to-cart').forEach(function (button) {
        button.addEventListener('click', async function () {
            var name = button.dataset.productName || 'Item';

            var data = await addToCart(button);

            if (!data) {
                return;
            }

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

    /**
     * Buy now is add-to-cart plus a navigation. The button stays in its
     * loading state through the navigation, so a second click cannot
     * add the item twice.
     */
    App.$$('.js-buy-now').forEach(function (button) {
        button.addEventListener('click', async function () {
            var data = await addToCart(button);

            if (!data) {
                return;
            }

            App.setLoading(button, true);

            window.location.href = '/checkout';
        });
    });
})();
