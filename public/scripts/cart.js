const cartToast = document.querySelector('.js-cart-toast');
const cartToastMessage = document.querySelector(
    '.js-cart-toast-message'
);


const undoButton = document.querySelector('.js-undo-button');

let toastTimeout;

// Stores the most recently deleted Item
let deletedItem = null;

function showCartToast(message) {

    clearTimeout(toastTimeout);

    // Make sure Undo is clickable again
    undoButton.disabled = false;

    cartToastMessage.textContent = message;
    cartToast.classList.add('show');

    toastTimeout = setTimeout(() => {

        cartToast.classList.remove('show');
        deletedItem = null;

    }, 5000);

}

function hideCartToast() {
    clearTimeout(toastTimeout);

    cartToast.classList.remove('show');

    deletedItem = null;
}


document.querySelectorAll(
    '.js-increase-button, .js-decrease-button'
).forEach((button) => {

    button.addEventListener('click', async () => {
        try {
            const { productId } = button.dataset;

            const quantityChange =
                button.classList.contains('js-increase-button')
                    ? 1
                    : -1;

            const response = await fetch(`/cart/${productId}`, {
                method: 'PATCH',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    quantityChange
                })
            });

            const data = await response.json();

            if (data.updated) {

                // Update this product's quantity
                document.querySelector(
                    `.js-quantity-${productId}`
                ).textContent = data.itemQuantity;

                // Update header cart quantity
                document.querySelector(
                    '.js-cart-quantity'
                ).textContent = data.cartQuantity;

                // update bottom subtotal item count
                document.querySelector(
                    '.js-bottom-cart-quantity'
                ).textContent = data.cartQuantity;

                // update bottom subtotal price
                document.querySelector(
                    '.js-bottom-subtotal'
                ).textContent = data.subtotal

                // update right-side subtotal item count 
                document.querySelector(
                    '.js-right-cart-quantity'
                ).textContent = data.cartQuantity;

                // update right-side subtotal price
                document.querySelector(
                    '.js-right-subtotal'
                ).textContent = data.subtotal;
                
            }

        } catch (error) {
            console.error(
                'Update quantity error:',
                error
            );
        }
    });

});





document.querySelectorAll('.js-delete-button')
    .forEach((button) => {

        button.addEventListener('click', async () => {

            try {
                const { productId } = button.dataset;

                const cartItem = document.querySelector(`.js-cart-item-${productId}`);

                // Get the current quantity before deletion 
                const quantity = Number(cartItem.querySelector(`.js-quantity-${productId}`).textContent)

                // Prevent multiple clicks
                button.disabled = true;

                const response = await fetch(
                    `/cart/${productId}`,
                    {
                        method: 'DELETE'
                    }
                );

                const data = await response.json();

                if (!data.deleted) {
                    button.disabled = false;
                    return;
                }

                // Remember the deleted item for undo
                deletedItem = {
                    productId,
                    quantity
                };

                // Start smooth removal animation
                cartItem.classList.add('removing');

                // Wait for the animation to finish
                setTimeout(() => {

                    // Remove item completely from the document
                    cartItem.remove();

                    // If cart is now empty, reload to show empty cart
                    if (data.cartQuantity === 0) {
                        window.location.reload();
                        return;
                    }

                    // Update header cart quantity
                    document.querySelector(
                        '.js-cart-quantity'
                    ).textContent = data.cartQuantity;


                    // Update bottom subtotal item count
                    document.querySelector(
                        '.js-bottom-cart-quantity'
                    ).textContent = data.cartQuantity;


                    // Update bottom subtotal price
                    document.querySelector(
                        '.js-bottom-subtotal'
                    ).textContent = data.subtotal;


                    // Update right-side subtotal item count
                    document.querySelector(
                        '.js-right-cart-quantity'
                    ).textContent = data.cartQuantity;


                    // Update right-side subtotal price
                    document.querySelector(
                        '.js-right-subtotal'
                    ).textContent = data.subtotal;

                    // Show confirmation toast
                    showCartToast('Item removed from your cart');

                }, 300);


            } catch (error) {
                console.error(
                    'Delete cart item error:',
                    error
                );

                button.disabled = false;
            }

        });

    });



undoButton.addEventListener('click', async () => {
 
    if (!deletedItem) {
        return;
    }

    try {

        // Prevent multiple clicks
        undoButton.disabled = true;

        const { productId, quantity } = deletedItem;

        console.log('Restoring item:', {
            productId,
            quantity
        });

        const response = await fetch(
            `/cart/${productId}`,
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    quantity
                })
            }
        );

        const data = await response.json();

        console.log('Undo response:', data);


        if (!response.ok) {
            throw new Error(
                data.message || 'Failed to restore item'
            );
        }


        if (data.added) {

            clearTimeout(toastTimeout);

            cartToast.classList.remove('show');

            deletedItem = null;

            // Reload to show the restored item
            window.location.reload();
        }

    } catch (error) {

        console.error(
            'Undo delete error:',
            error
        );

        // Allow user to try again
        undoButton.disabled = false;

    }

});


const checkoutButton = document.querySelector('.js-checkout-button');
const checkoutLoadingOverlay = document.querySelector('.js-checkout-loading-overlay');


checkoutButton.addEventListener( 'click', () => {
        
    // Prevent accidental double clicks
    checkoutButton.disabled = true;


    // Show loading overlay
    checkoutLoadingOverlay.classList.add('active');

    // small delay so the transition feels smooth
        setTimeout(() => {
            window.location.href = '/checkout';
        }, 1200);
})