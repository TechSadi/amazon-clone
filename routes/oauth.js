import express from 'express';

import { startOAuth, oauthCallback } from '../controllers/oauth.js';
import { requireGuest } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// Both steps are GETs the provider drives, so they carry no CSRF token.
// The `state` parameter checked in the controller is what protects the
// callback.
router.get('/:provider', authLimiter, requireGuest, startOAuth);

router.get('/:provider/callback', authLimiter, oauthCallback);

export default router;
