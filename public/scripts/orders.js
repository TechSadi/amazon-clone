document.querySelectorAll('.js-buy-again-button')
    .forEach((button) => {

        button.addEventListener('click', async () => {

            const { productId, quantity } = button.dataset;

            try {

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

                if (data.added) {
                    window.location.href = '/cart';
                } else {
                    alert(data.message);
                }

            } catch (error) {

                console.error(
                    'Buy again error:',
                    error
                );

                alert(
                    'Something went wrong while adding the product to the cart'
                );

            }

        });

    });