import Cart from '../models/cart.js';
import { calculateCartQuantity } from '../utils/cart.js';
import { getSubtotal, getTotalShippingCost } from '../utils/checkout.js';
import { formatCurrency } from '../utils/money.js';
import {
    deliveryOptions,
    getDeliveryOption,
    calculateDeliveryDate
} from '../data/deliveryOptions.js';

import Order from '../models/order.js';


function getEstimatedTax(totalBeforeTax) {
    return Math.round(0.1 * totalBeforeTax);
}

function getOrderTotal(totalBeforeTax, estimatedTax) {
    return totalBeforeTax + estimatedTax;
}

export const loadCheckout = async (req, res) => {

    const cart = await Cart.findOne({ user: req.session.userId })
        .populate('items.product');

    if (!cart) {
        return res.status(404).json({
            message: 'Cart is not found'
        });
    }

    const products = cart.items;
    const cartQuantity = calculateCartQuantity(cart);
    const subtotal = getSubtotal(cart);
    const totalShippingCost = getTotalShippingCost(cart);
    const totalBeforeTax = (subtotal + totalShippingCost);
    const estimatedTax = getEstimatedTax(totalBeforeTax);
    const orderTotal = getOrderTotal(totalBeforeTax, estimatedTax);

    res.render('checkout/checkout', {
        cart,
        products,
        cartQuantity,
        deliveryOptions,
        getDeliveryOption,
        calculateDeliveryDate,
        subtotal: formatCurrency(subtotal),
        totalShippingCost: formatCurrency(totalShippingCost),
        totalBeforeTax: formatCurrency(totalBeforeTax),
        estimatedTax: formatCurrency(estimatedTax),
        orderTotal: formatCurrency(orderTotal)
    });
};

export const updateQuantity = async (req, res) => {
    const { productId } = req.params;
    let { newQuantity } = req.body;

    const cart = await Cart.findOne({ user: req.session.userId })
        .populate('items.product');

    if (!cart) {
        return res.status(404).json({
            message: 'Cart not found'
        });
    }

    const cartItem = cart.items.find(
        item => item.product._id.toString() === productId
    );

    if (!cartItem) {
        return res.status(404).json({
            message: 'Product not found in cart'
        });
    }

    if (!Number.isFinite(newQuantity) || newQuantity < 1 || newQuantity > 1000) {
        newQuantity = 1;
    }

    // update cart item quantity to the new quantity
    cartItem.quantity = newQuantity;

    await cart.save();

    const cartQuantity = calculateCartQuantity(cart);
    const cartItemPrice = formatCurrency(cartItem.quantity * cartItem.product.priceCents);
    const subtotal = getSubtotal(cart);
    const totalBeforeTax = getTotalShippingCost(cart) + subtotal;
    const estimatedTax = getEstimatedTax(totalBeforeTax);
    const orderTotal = getOrderTotal(totalBeforeTax, estimatedTax);

    res.json({
        updated: true,
        itemQuantity: cartItem.quantity,
        cartItemPrice,
        cartQuantity,
        subtotal: formatCurrency(subtotal),
        totalBeforeTax: formatCurrency(totalBeforeTax),
        estimatedTax: formatCurrency(estimatedTax),
        orderTotal: formatCurrency(orderTotal)
    });
}


export const deleteCartItem = async (req, res) => {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.session.userId })
        .populate('items.product');

    if (!cart) {
        return res.status(404).json({
            deleted: false,
            message: 'Cart not found'
        });
    }

    const cartItem = cart.items.find(
        item => item.product._id.toString() === productId
    );

    if (!cartItem) {
        return res.status(404).json({
            deleted: false,
            message: 'Product not found in cart'
        });
    }

    // Remove the item from the cart
    cart.items = cart.items.filter(
        item => item.product._id.toString() !== productId
    );

    await cart.save();

    // Calculate updated cart quantity
    const cartQuantity = calculateCartQuantity(cart);

    // Calculate updated subtotal
    const subtotal = getSubtotal(cart);
    const totalShippingCost = getTotalShippingCost(cart);
    const totalBeforeTax = subtotal + totalShippingCost;
    const estimatedTax = getEstimatedTax(totalBeforeTax);
    const orderTotal = getOrderTotal(totalBeforeTax, estimatedTax);

    res.json({
        deleted: true,
        cartQuantity,
        subtotal: formatCurrency(subtotal),
        totalShippingCost: formatCurrency(totalShippingCost),
        totalBeforeTax: formatCurrency(totalBeforeTax),
        estimatedTax: formatCurrency(estimatedTax),
        orderTotal: formatCurrency(orderTotal)
    });
};


export const updateDeliveryOption = async (req, res) => {
    try {
        const { productId } = req.params;
        const { deliveryOptionId } = req.body;

        // Check if the delivery option exists
        const deliveryOption = getDeliveryOption(
            deliveryOptionId
        );

        if (
            deliveryOption.id !== deliveryOptionId
        ) {
            return res.status(400).json({
                updated: false,
                message: 'Invalid delivery option'
            });
        }

        const cart = await Cart.findOne({ user: req.session.userId })
            .populate('items.product');

        if (!cart) {
            return res.status(404).json({
                updated: false,
                message: 'Cart not found'
            });
        }

        const cartItem = cart.items.find(
            (item) =>
                item.product._id.toString() === productId
        );

        if (!cartItem) {
            return res.status(404).json({
                updated: false,
                message: 'Product not found in cart'
            });
        }

        // Update the selected delivery option
        cartItem.deliveryOptionId = deliveryOptionId;

        await cart.save();

        const newDeliveryOption = getDeliveryOption(deliveryOptionId);
        const deliveryDate = calculateDeliveryDate(newDeliveryOption);

        const subtotal = getSubtotal(cart);
        const totalShippingCost = getTotalShippingCost(cart);
        const totalBeforeTax = subtotal + totalShippingCost;
        const estimatedTax = getEstimatedTax(totalBeforeTax);
        const orderTotal = getOrderTotal(totalBeforeTax, estimatedTax);

        res.json({
            updated: true,
            deliveryOptionId,
            deliveryDate,
            totalShippingCost: formatCurrency(totalShippingCost),
            totalBeforeTax: formatCurrency(totalBeforeTax),
            estimatedTax: formatCurrency(estimatedTax),
            orderTotal: formatCurrency(orderTotal)
        });

    } catch (error) {
        console.error(
            'Update delivery option error:',
            error
        );

        res.status(500).json({
            updated: false,
            message: 'Something went wrong'
        });
    }
};



export const placeOrder = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.session.userId })
            .populate('items.product');

        if (!cart) {
            return res.status(404).json({
                ordered: false,
                message: 'Cart not found'
            });
        }

        if (cart.items.length === 0) {
            return res.status(400).json({
                ordered: false,
                message: 'Cart is empty'
            });
        }

        // Calculate the final order total
        const subtotal = getSubtotal(cart);
        const totalShippingCost = getTotalShippingCost(cart);
        const totalBeforeTax = subtotal + totalShippingCost;
        const estimatedTax = getEstimatedTax(totalBeforeTax);
        const totalPriceCents = getOrderTotal(totalBeforeTax, estimatedTax);

        // Create the order
        const order = await Order.create({
            user: req.session.userId,
            
            items: cart.items.map((item) => ({
                product: item.product._id,
                quantity: item.quantity,
                deliveryOptionId: item.deliveryOptionId
            })),

            totalPriceCents
        });

        // Clear the cart after successfully creating the order
        cart.items = [];

        await cart.save();

        res.json({
            ordered: true,
            orderId: order._id
        });
        

    } catch (error) {
        console.error('Place order error:', error)

        res.status(500).json({
            ordered: false,
            message: 'Something went wrong while placing the order'
        });

    }
};