import dotenv from 'dotenv';
import mongoose from 'mongoose';

import connectDB from './config/db.js';
import Product from './models/product.js';
import products from './data/products.js';

dotenv.config();

const seedDatabase = async () => {
    try {
        await connectDB();

        // Remove existing products
        await Product.deleteMany({});

        // Insert products from data/products.js
        await Product.insertMany(products);

        console.log('Products seeded successfully!');

        await mongoose.connection.close();

        console.log('Database connection closed.');

    } catch (error) {
        console.error('Error seeding database:', error);

        await mongoose.connection.close();

        process.exit(1);
    }
};

seedDatabase();