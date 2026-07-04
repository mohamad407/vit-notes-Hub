const { getAuth } = require('../config/firebase');
   const User = require('../models/user');
const Admin = require('../models/Admin');

// Verify Firebase token and attach user
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const auth = getAuth();
        
        // Verify the token
        const decodedToken = await auth.verifyIdToken(token);
        
        // Check if email is VIT student
        if (!decodedToken.email.endsWith('@vitstudent.ac.in')) {
            return res.status(403).json({ 
                error: 'Only VIT students can access VITNotes Hub' 
            });
        }

        // Find or create user
        let user = await User.findOne({ firebaseUid: decodedToken.uid });
        
        if (!user) {
            // Check if admin
            const adminDoc = await Admin.findOne({ 
                email: decodedToken.email,
                isActive: true 
            });
            
            user = await User.create({
                firebaseUid: decodedToken.uid,
                name: decodedToken.name || decodedToken.email.split('@')[0],
                email: decodedToken.email,
                photo: decodedToken.picture || '',
                role: adminDoc ? 'admin' : 'student',
                lastLogin: new Date()
            });
        } else {
            // Update last login
            user.lastLogin = new Date();
            await user.save();
        }

        req.user = user;
        req.firebaseUid = decodedToken.uid;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Admin only middleware
const isAdmin = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            // Double check in admins collection
            const adminDoc = await Admin.findOne({ 
                email: req.user.email,
                isActive: true 
            });
            
            if (!adminDoc) {
                return res.status(403).json({ error: 'Admin access required' });
            }
            
            // Update user role
            req.user.role = 'admin';
            await req.user.save();
        }
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Admin access required' });
    }
};

module.exports = { verifyToken, isAdmin };
