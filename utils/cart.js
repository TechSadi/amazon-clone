export const calculateCartQuantity = (cart) => {
    if (!cart) {
        return 0;
    }

    return cart.items.reduce(
        (total, item) => total + item.quantity,
        0
    );
};
