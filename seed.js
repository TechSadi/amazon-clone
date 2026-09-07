import connectDB, { disconnectDB } from './config/db.js';
import Product from './models/product.js';
import products from './data/products.js';

/**
 * Replaces the product catalogue with the contents of data/products.js.
 *
 * Deliberately destructive and never run by the server itself: use
 * `npm run seed`.
 */
const seedDatabase = async () => {
    try {
        await connectDB();

        await Product.deleteMany({});

        // The source data carries a legacy `id` field that is not part
        // of the schema; strip it so Mongo assigns real _id values.
        const seedProducts = products.map(({ id, ...product }) => product);

        await Product.insertMany(seedProducts);

        console.log(`${seedProducts.length} products seeded.`);

        await disconnectDB();
    } catch (error) {
        console.error('Error seeding database:', error.message);

        await disconnectDB().catch(() => {});

        process.exit(1);
    }
};

seedDatabase();
