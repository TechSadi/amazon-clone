import express from 'express';

import {
    loadRegister,
    loadLogin,
    registerUser,
    loginUser,
    logoutUser
} from '../controllers/users.js';

import { requireGuest } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

router.get('/register', requireGuest, loadRegister);
router.post('/register', authLimiter, requireGuest, registerUser);

router.get('/login', requireGuest, loadLogin);
router.post('/login', authLimiter, requireGuest, loginUser);

router.post('/logout', logoutUser);

export default router;
