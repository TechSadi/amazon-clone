import * as orderService from '../services/orderService.js';
import * as cartService from '../services/cartService.js';
import { formatDeliveryDate } from '../data/deliveryOptions.js';

export const loadOrderTracking = async (req, res) => {
    const userId = req.session.userId;
    const { orderId, productId } = req.params;

    // The order is looked up by id *and* owner, so one customer cannot
    // read another's order by guessing or copying an order id.
    const [{ order, item }, cartQuantity] = await Promise.all([
        orderService.getOrderItemForUser(userId, orderId, productId),
        cartService.getCartQuantity(userId)
    ]);

    res.render('tracking/tracking', {
        item,
        deliveryDate: formatDeliveryDate(item.estimatedDeliveryDate),
        percentProgress: orderService.calculateDeliveryProgress(order, item),
        cartQuantity
    });
};
