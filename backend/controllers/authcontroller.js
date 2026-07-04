const User = require('../models/user');
const Admin = require('../models/admin');

// Login/Register user
const loginUser = async (req, res) => {
    try {
        const user = req.user;
        
        // Generate a simple session token (you can use JWT here)
        const token = user.firebaseUid;
        
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                photo: user.photo,
                role: user.role,
                uploadCount: user.uploadCount
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};

// Get current user profile
const getProfile = async (req, res) => {
    try {
        res.json({
            success: true,
            user: req.user
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get profile' });
    }
};

module.exports = { loginUser, getProfile };
