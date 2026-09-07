document.querySelectorAll('.js-buy-again-button').forEach((button) => {
    button.addEventListener('click', async () => {
        const { productId, quantity } = button.dataset;

        button.disabled = true;

        try {
            const data = await window.apiFetch(`/cart/${productId}`, {
                method: 'POST',
                body: { quantity: Number(quantity) }
            });

            if (!data) {
                return;
            }

            window.location.href = '/cart';
        } catch (error) {
            window.alert(error.message);
            button.disabled = false;
        }
    });
});
