/**
 * Add to cart, used by both the product grid and the product page.
 *
 * The product page previously loaded a near-identical second copy of
 * this file, so every click ran two handlers.
 */
const addedMessageTimeouts = {};

function showAddedMessage(productId) {
    const addedMessage = document.querySelector(
        `.js-added-to-cart-${productId}`
    );

    if (!addedMessage) {
        return;
    }

    addedMessage.classList.add('added-to-cart-visible');

    clearTimeout(addedMessageTimeouts[productId]);

    addedMessageTimeouts[productId] = setTimeout(() => {
        addedMessage.classList.remove('added-to-cart-visible');
    }, 2000);
}

document.querySelectorAll('.js-add-to-cart').forEach((button) => {
    button.addEventListener('click', async () => {
        const { productId } = button.dataset;

        // The grid has a quantity selector; the product page does not.
        const quantitySelector = document.querySelector(
            `.js-quantity-selector-${productId}`
        );

        const quantity = quantitySelector
            ? Number(quantitySelector.value)
            : 1;

        button.disabled = true;

        try {
            const data = await window.apiFetch(`/cart/${productId}`, {
                method: 'POST',
                body: { quantity }
            });

            if (!data) {
                return;
            }

            window.setCartQuantity(data.cartQuantity);
            showAddedMessage(productId);
        } catch (error) {
            window.alert(error.message);
        } finally {
            button.disabled = false;
        }
    });
});
