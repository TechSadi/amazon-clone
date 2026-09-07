import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    image: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    rating: {
        stars: {
            type: Number,
            min: 0,
            max: 5
        },

        count: {
            type: Number,
            default: 0
        }
    },
    priceCents: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String
    },
    keywords: [{
        type: String
    }]
},
    {
        timestamps: true
    }
);


export default mongoose.model('Product', productSchema);