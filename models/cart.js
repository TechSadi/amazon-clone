import mongoose from 'mongoose';
import { DEFAULT_DELIVERY_OPTION_ID } from '../data/deliveryOptions.js';

export const MAX_ITEM_QUANTITY = 100;

const cartItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },

        quantity: {
            type: Number,
            required: true,
            default: 1,
            min: 1,
            max: MAX_ITEM_QUANTITY,
            validate: {
                validator: Number.isInteger,
                message: 'Quantity must be a whole number.'
            }
        },

        deliveryOptionId: {
            type: String,
            required: true,
            default: DEFAULT_DELIVERY_OPTION_ID
        }
    },
    { _id: false }
);

const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true
        },

        items: {
            type: [cartItemSchema],
            default: []
        }
    },
    {
        timestamps: true
    }
);

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
