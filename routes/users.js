import express from 'express';

import {
    loadRegister,
    loadLogin,
    registerUser,
    loginUser,
    logoutUser
} from '../controllers/users.js';

const router = express.Router();

router.get('/register', loadRegister);
router.post('/register', registerUser);
router.get('/login', loadLogin);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

export default router;