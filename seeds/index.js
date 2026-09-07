import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Product from '../models/product.js';
import products from '../data/products.js';
import dotenv from 'dotenv';

dotenv.config();

connectDB();


await Product.deleteMany({});

const seedProducts = products.map(({ id, ...product }) => product);

await Product.insertMany(seedProducts);

console.log(`${seedProducts.length} products inserted.`);


