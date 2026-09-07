const addedMessageTimeouts1 = {};

document.querySelectorAll('.js-add-to-cart')
    .forEach((button) => {

        button.addEventListener('click', async () => {
            try {
                const { productId } = button.dataset;
                

                const response = await fetch(`/cart/${productId}`, {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        quantity: 1
                    })
                });
                const data = await response.json();

                if (data.added) {
                    const addedMessage = document.querySelector(
                        `.js-added-to-cart-${productId}`)
                    
                    if (!addedMessage) {
                        console.log("Added message element not found");
                        return;
                    }

                    addedMessage.classList.add(
                        'added-to-cart-visible'
                    );

                    const previousTimeoutId =
                        addedMessageTimeouts1[productId];

                    if (previousTimeoutId) {
                        clearTimeout(previousTimeoutId);
                    }

                    const timeoutId = setTimeout(() => {
                        addedMessage.classList.remove(
                            'added-to-cart-visible'
                        );
                    }, 2000);

                    addedMessageTimeouts1[productId] = timeoutId;

                    
                    document.querySelector('.js-cart-quantity').innerHTML = data.cartQuantity
                }

            } catch (error) {
                console.error('Add to cart error:', error);
            }
        });

    });