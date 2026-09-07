import Order from "../models/order.js";
import dayjs from 'dayjs';
import {
    getDeliveryOption,
    calculateDeliveryDate
} from "../data/deliveryOptions.js";
import Cart from "../models/cart.js";
import { calculateCartQuantity } from "../utils/cart.js";

export const loadOrderTracking = async (req, res) => {

    const { orderId, productId } = req.params;

    try {
        const order = await Order.findById(orderId).populate('items.product');

        const cart = await Cart.findOne();
        const cartQuantity = calculateCartQuantity(cart);

        const productDetails = order.items.find(
            (item) => item.product._id.toString() === productId
        );

        const deliveryOption = getDeliveryOption(productDetails.deliveryOptionId);
        const deliveryDate = calculateDeliveryDate(deliveryOption);

        const today = dayjs();
        const orderTime = dayjs(order.createdAt);
        const deliveryTime = dayjs(deliveryDate);

        
        const rawPercentProgress = ((today - orderTime) / (deliveryTime - orderTime)) * 100;
        const percentProgress = Math.min(100, Math.max(0, rawPercentProgress));
        
        res.render('tracking/tracking', {
            productDetails,
            dayjs,
            deliveryDate,
            percentProgress,
            cartQuantity
        });

    } catch (error) {
        console.error('Load product error: ', error)

        res.status(500).json({
            'message': 'Something went wrong while loading the product'
        })
    }

}