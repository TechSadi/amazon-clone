import mongoose from 'mongoose';
import config from './env.js';

/**
 * Opens the shared Mongoose connection.
 * Startup failures are fatal, but failures after boot are left to
 * Mongoose's own reconnection logic instead of killing the process.
 */
const connectDB = async () => {
    mongoose.set('strictQuery', true);

    mongoose.connection.on('error', (error) => {
        console.error('MongoDB connection error:', error.message);
    });

    mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected. Mongoose will retry.');
    });

    await mongoose.connect(config.mongoUri, {
        serverSelectionTimeoutMS: 10000
    });

    console.log('MongoDB connected');
};

export const disconnectDB = async () => {
    await mongoose.connection.close();
};

export default connectDB;
