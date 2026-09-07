import mongoose from 'mongoose';

export const ORDER_STATUSES = ['placed', 'shipped', 'delivered'];

/**
 * Order items are a snapshot, not a live reference.
 *
 * Name, image and price are copied at the moment the order is placed so
 * that editing or deleting a product later cannot rewrite or break
 * order history. `product` is kept only so "Buy it again" and tracking
 * can link back to the catalogue.
 */
const orderItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },

        name: {
            type: String,
            required: true
        },

        image: {
            type: String,
            required: true
        },

        priceCents: {
            type: Number,
            required: true,
            min: 0
        },

        quantity: {
            type: Number,
            required: true,
            min: 1
        },

        deliveryOptionId: {
            type: String,
            required: true
        },

        shippingCents: {
            type: Number,
            required: true,
            min: 0
        },

        estimatedDeliveryDate: {
            type: Date,
            required: true
        }
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        items: {
            type: [orderItemSchema],
            required: true,
            validate: {
                validator: (items) => Array.isArray(items) && items.length > 0,
                message: 'An order must contain at least one item.'
            }
        },

        subtotalCents: { type: Number, required: true, min: 0 },
        shippingCents: { type: Number, required: true, min: 0 },
        taxCents: { type: Number, required: true, min: 0 },
        totalPriceCents: { type: Number, required: true, min: 0 },

        status: {
            type: String,
            enum: ORDER_STATUSES,
            default: 'placed'
        }
    },
    {
        timestamps: true
    }
);

// Orders are only ever read as "this user's orders, newest first".
orderSchema.index({ user: 1, createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
