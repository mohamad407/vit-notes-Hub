const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { loginUser, getProfile } = require('../controllers/authcontroller');

// POST /api/auth/login - Verify token and login/register user
router.post('/login', verifyToken, loginUser);

// GET /api/auth/profile - Get current user profile
router.get('/profile', verifyToken, getProfile);

module.exports = router;
