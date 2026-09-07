import Order from "../models/order.js"
import Cart from "../models/cart.js";
import { formatCurrency } from "../utils/money.js";
import {
    calculateDeliveryDate,
    getDeliveryOption
} from "../data/deliveryOptions.js";
import { calculateCartQuantity } from "../utils/cart.js";
import dayjs from 'dayjs';


export const loadOrders = async (req, res) => {
    
    try {
        const orders = await Order.find({ user: req.session.userId })
            .populate('items.product')
            .sort({ createdAt: -1 });
        
        const cart = await Cart.findOne({ user: req.session.userId });
        
        const cartQuantity = cart ? calculateCartQuantity(cart) : 0;

        res.render('orders/orders', {
            orders,
            formatCurrency,
            getDeliveryOption,
            calculateDeliveryDate,
            dayjs,
            cartQuantity
        });
    
    } catch (error) {
        console.error('Load orders error:', error);

        res.status(500).json({
            message: 'Something went wrong while loading orders'
        });
    }
};