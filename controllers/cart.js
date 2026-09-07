import Cart from '../models/cart.js';
import Product from '../models/product.js';
import { calculateCartQuantity}
    from '../utils/cart.js';

export const addToCart = async (req, res) => {
    const { productId } = req.params;
    const { quantity } = req.body;
    const quantityNumber = Number(quantity);

    // check if the product exists
    const product = await Product.findById(productId);

    if (!product) {
        return res.status(404).send("Product not found");
    }

    // Find the existing cart
    let cart = await Cart.findOne({ user: req.session.userId });

    // If no cart exists, create one 
    if (!cart) {
        cart = new Cart({
            user: req.session.userId,
            items: []
        });
    }

    // Check whether the product is already in the cart
    const existingItem = cart.items.find(
        item => item.product.toString() === productId
    );

    if (existingItem) {
        existingItem.quantity += quantityNumber;
    }
    else {
        cart.items.unshift({
            product: productId,
            quantity: quantityNumber
        });
    }

    await cart.save();
    const cartQuantity = calculateCartQuantity(cart);
    res.json({
        added: true,
        message: "Product added to cart",
        cartQuantity: cartQuantity
    })
}


export const loadCart = async (req, res) => {

    const cart = await Cart.findOne({ user: req.session.userId })
        .populate('items.product');

    if (!cart) {
        return res.render('cart/cart', {
            cart: null,
            cartQuantity: 0
        });
    }

    const cartQuantity = calculateCartQuantity(cart);
    res.render('cart/cart', { cart, cartQuantity });
}


export const updateQuantity = async (req, res) => {
    const { productId } = req.params;
    const { quantityChange } = req.body;

    // Find the cart
    const cart = await Cart.findOne({ user: req.session.userId })
        .populate('items.product');

    if (!cart) {
        return res.status(404).json({
            message: 'Cart not found'
        });
    }

    // Find the product inside the cart
    const cartItem = cart.items.find(
        item => item.product._id.toString() === productId
    );

    if (!cartItem) {
        return res.status(404).json({
            message: 'Product not found in cart'
        });
    }

    // Increase or decrease quantity
    cartItem.quantity += Number(quantityChange);

    // Don't allow quantity to go below 1
    if (cartItem.quantity < 1) {
        cartItem.quantity = 1;
    }

    await cart.save();

    const cartQuantity = calculateCartQuantity(cart);

    // calculate subtotal
    const subtotal = cart.items.reduce((total, item) => {
        return total + (
            item.product.priceCents * item.quantity
        );
    }, 0);

    res.json({
        updated: true,
        itemQuantity: cartItem.quantity,
        cartQuantity, 
        subtotal: (subtotal / 100).toFixed(2)
    });
};



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
    const subtotal = cart.items.reduce((total, item) => {
        return total + (
            item.product.priceCents * item.quantity
        );
    }, 0);

    res.json({
        deleted: true,
        cartQuantity,
        subtotal: (subtotal / 100).toFixed(2)
    });
};