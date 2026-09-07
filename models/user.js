import mongoose from 'mongoose';
import { EMAIL_PATTERN } from '../utils/validation.js';

export const AUTH_PROVIDERS = ['google', 'github', 'microsoft'];

/**
 * A social account this user can sign in with.
 *
 * Stored as a list rather than a single provider field so one customer
 * can link Google and GitHub to the same account and reach the same
 * cart and order history either way.
 */
const authProviderSchema = new mongoose.Schema(
    {
        provider: {
            type: String,
            required: true,
            enum: AUTH_PROVIDERS
        },

        providerId: {
            type: String,
            required: true
        }
    },
    { _id: false }
);

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
            // Required only for accounts that sign in with a password.
            // An account created through Google, GitHub or Microsoft has
            // no password at all, which is different from having a
            // guessable one.
            required() {
                return this.authProviders.length === 0;
            },
            // Never loaded unless a query explicitly asks for it with
            // .select('+password'). Keeps the hash out of res.locals,
            // view data and JSON responses by default.
            select: false
        },

        authProviders: {
            type: [authProviderSchema],
            default: []
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

// Sign-in looks an account up by the provider's own user id.
userSchema.index({
    'authProviders.provider': 1,
    'authProviders.providerId': 1
});

const User = mongoose.model('User', userSchema);

export default User;
