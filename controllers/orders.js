import * as orderService from '../services/orderService.js';
import * as cartService from '../services/cartService.js';

export const loadOrders = async (req, res) => {
    const userId = req.session.userId;

    const [orders, cartQuantity] = await Promise.all([
        orderService.listOrdersForUser(userId),
        cartService.getCartQuantity(userId)
    ]);

    res.render('orders/orders', { orders, cartQuantity });
};
