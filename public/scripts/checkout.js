document.querySelectorAll('.js-update-quantity-link')
    .forEach((link) => {
        link.addEventListener('click', () => {
            let productId = link.dataset.productId;

            let cartItemContainer = document.querySelector(
                `.js-cart-item-container-${productId}`);
            cartItemContainer.classList.add('is-editing-quantity');
        });
    });

document.querySelectorAll('.js-save-link')
    .forEach((link) => {

        link.addEventListener('click', async () => {
            const { productId } = link.dataset;

            const cartItemContainer = document.querySelector(
                `.js-cart-item-container-${productId}`
            );

            const quantityInput = document.querySelector(
                `.js-quantity-input-${productId}`
            );

            const newQuantity = Number(quantityInput.value);

            // Validate quantity
            if (
                !Number.isInteger(newQuantity) ||
                newQuantity < 1 ||
                newQuantity > 1000
            ) {
                alert("Product quantity must be a whole number between 1 and 1000");
                return;
            }

            try {
                const response = await fetch(`/checkout/${productId}`, {
                    method: 'PATCH',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify({
                        newQuantity
                    })
                });

                const data = await response.json();

                if (data.updated) {

                    // Update header cart quantity
                    document.querySelector(
                        '.js-return-to-home-link'
                    ).textContent = `${data.cartQuantity} items`;

                    // Update item quantity
                    document.querySelector(
                        `.js-quantity-label-${productId}`
                    ).textContent = data.itemQuantity;

                    // Update item price
                    document.querySelector(
                        `.js-product-price-${productId}`
                    ).textContent = `$ ${data.cartItemPrice}`;

                    // update item quantity on the order summary side
                    document.querySelector('.js-payment-summary-cart-items')
                        .textContent = `Items (${data.cartQuantity})`;
                    
                    // update total price for all products
                    document.querySelector('.js-payment-summary-money')
                        .textContent = `$${data.subtotal}`;
                    
                    // update total price before tax
                    document.querySelector('.js-total-before-tax')
                        .textContent = `$${data.totalBeforeTax}`;
                    
                    // update estimated tax
                    document.querySelector('.js-estimated-tax')
                        .textContent = `$${data.estimatedTax}`;
                    
                    // update order total
                    document.querySelector('.js-order-total')
                        .textContent = `$${data.orderTotal}`;
                    
                    // update cart quantity header

                    // Exit editing mode only after successful update
                    cartItemContainer.classList.remove(
                        'is-editing-quantity'
                    );
                }

            } catch (error) {
                console.error(
                    "Product Quantity could not be updated:",
                    error
                );
            }
        });

    });


document.querySelectorAll('.js-delete-link')
    .forEach((link) => {
        link.addEventListener('click', async () => {
            try {
                const { productId } = link.dataset;
                const response = await fetch(
                    `/checkout/${productId}`,
                    {
                        method: 'DELETE'
                    }
                );

                const data = await response.json();

                if (data.deleted) {
                    // Remove the product from the page
                    document.querySelector(
                        `.js-cart-item-container-${productId}`
                    ).remove();


                    // Update header cart quantity
                    document.querySelector(
                        '.js-return-to-home-link'
                    ).textContent = data.cartQuantity + ' items';

                    // update cart items in order summary
                    document.querySelector('.js-payment-summary-cart-items')
                        .textContent = `Items (${data.cartQuantity})`;

                    // update cart items price in order summary
                    document.querySelector('.js-payment-summary-money')
                        .textContent = `$${data.subtotal}`;
                    
                    // update total shipping cost
                    document.querySelector('.js-shipping-handling')
                        .textContent = `$${data.totalShippingCost}`;
                             
                    // update total price before tax
                    document.querySelector('.js-total-before-tax')
                        .textContent = `$${data.totalBeforeTax}`;

                    // update estimated tax
                    document.querySelector('.js-estimated-tax')
                        .textContent = `$${data.estimatedTax}`;
                    
                    // update order total
                    document.querySelector('.js-order-total')
                        .textContent = `$${data.orderTotal}`;
                }

            } catch (error) {
                console.error(
                    'Delete cart item error:',
                    error
                );
            }
        });
    });


document.querySelectorAll('.js-delivery-option')
    .forEach((element) => {

        element.addEventListener('click', async () => {

            try {

                const {
                    productId,
                    deliveryOptionId
                } = element.dataset;

                const response = await fetch(
                    `/checkout/${productId}/delivery-option`,
                    {
                        method: 'PATCH',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({
                            deliveryOptionId
                        })
                    }
                );

                const data = await response.json();

                if (data.updated) {
                    
                    // update the total shipping and handling cost
                    document.querySelector('.js-shipping-handling')
                        .textContent = `$${data.totalShippingCost}`;
                    
                    // update the total before tax 
                    document.querySelector('.js-total-before-tax')
                        .textContent = `$${data.totalBeforeTax}`;
                    
                    // update estimated tax
                    document.querySelector('.js-estimated-tax')
                        .textContent = `$${data.estimatedTax}`;
                    
                    // update order total
                    document.querySelector('.js-order-total')
                        .textContent = `$${data.orderTotal}`;
                    
                    // update delivery date
                    document.querySelector(`.js-delivery-date-${productId}`)
                        .textContent = `Delivery date: ${data.deliveryDate}`;
                }

            } catch (error) {

                console.error(
                    'Update delivery option error:',
                    error
                );

            }

        });

    });


const placeOrderButton = document.querySelector('.js-place-order-button');
const placeOrderText = document.querySelector('.js-place-order-text');
const successOverlay = document.querySelector('.js-order-success-overlay');

document.querySelector('.js-place-order-button')
    .addEventListener('click', async () => {

        if (placeOrderButton.disable) {
            return;
        }

        // Immediately update the UI
        placeOrderButton.disabled = true;
        placeOrderButton.classList.add('loading');
        placeOrderText.textContent = 'Placing your order...';

        try {
            const response = await fetch('/checkout/place-order',
                {
                    method: 'POST'
                }
            );

            const data = await response.json();

            if (data.ordered) {

                // Hide the loading state
                placeOrderButton.classList.remove('loading');

                // Show success animation
                successOverlay.classList.add('active');

                // Redirect to the orders page after 2 seconds

                setTimeout(() => {
                    window.location.href = '/orders';
                }, 2000);
                
            } else {
                alert(data.message);
            }

        } catch (error) {
            console.error('Place Order error', error);
            alert('Something went wrong while placing your order');

            // Restore the button if something goes wrong
            placeOrderButton.disabled = false;
            placeOrderButton.classList.remove('loading');
            placeOrderText.textContent = 'Place your order';
        }
    });