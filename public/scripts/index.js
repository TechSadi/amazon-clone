
const addedMessageTimeouts = {};

document.querySelectorAll('.js-add-to-cart')
    .forEach((button) => {

        button.addEventListener('click', async () => {
            try {
                const { productId } = button.dataset;

                const quantitySelector = document.querySelector(`.js-quantity-selector-${productId}`);
                const quantity = Number(quantitySelector.value);


                const response = await fetch(`/cart/${productId}`,{
                        method: 'POST',
                    
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            quantity
                        })
                    });
                const data = await response.json();

                if (data.added) {

                    document.querySelector('.js-cart-quantity').innerHTML = data.cartQuantity
                    const addedMessage = document.querySelector(
                        `.js-added-to-cart-${productId}`
                    );

                    if (!addedMessage) {
                        console.error('Added message element not found');
                        return;
                    }

                    addedMessage.classList.add(
                        'added-to-cart-visible'
                    );

                    const previousTimeoutId =
                        addedMessageTimeouts[productId];

                    if (previousTimeoutId) {
                        clearTimeout(previousTimeoutId);
                    }

                    const timeoutId = setTimeout(() => {
                        addedMessage.classList.remove(
                            'added-to-cart-visible'
                        );
                    }, 2000);

                    addedMessageTimeouts[productId] = timeoutId;

                }

            } catch (error) {
                console.error('Add to cart error:', error);
            }
        });

    });