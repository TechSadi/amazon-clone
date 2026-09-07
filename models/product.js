import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
    {
        image: {
            type: String,
            required: true,
            trim: true
        },

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 300
        },

        rating: {
            stars: {
                type: Number,
                min: 0,
                max: 5,
                default: 0
            },

            count: {
                type: Number,
                min: 0,
                default: 0
            }
        },

        priceCents: {
            type: Number,
            required: true,
            min: 0,
            validate: {
                validator: Number.isInteger,
                message: 'Price must be a whole number of cents.'
            }
        },

        category: {
            type: String,
            trim: true
        },

        keywords: [
            {
                type: String,
                trim: true
            }
        ]
    },
    {
        timestamps: true
    }
);

const Product = mongoose.model('Product', productSchema);

export default Product;
