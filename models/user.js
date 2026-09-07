import mongoose from 'mongoose';
import { EMAIL_PATTERN } from '../utils/validation.js';

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            maxlength: 254,
            match: [EMAIL_PATTERN, 'Please enter a valid email address.']
        },

        password: {
            type: String,
            required: true,
            // Never loaded unless a query explicitly asks for it with
            // .select('+password'). Keeps the hash out of res.locals,
            // view data and JSON responses by default.
            select: false
        }
    },

    {
        timestamps: true,

        toJSON: {
            transform(doc, ret) {
                delete ret.password;
                delete ret.__v;
                return ret;
            }
        }
    }
);

const User = mongoose.model('User', userSchema);

export default User;
