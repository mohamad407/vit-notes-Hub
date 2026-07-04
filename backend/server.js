require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Config
const { connectDB } = require('./config/db');
const { initFirebase } = require('./config/firebase');
const { initCloudinary } = require('./config/cloudinary');

// Routes - ALL LOWERCASE
const authRoutes = require('./routes/authroutes');
const noteRoutes = require('./routes/noteroutes');
const announcementRoutes = require('./routes/announcementroutes');
const adminRoutes = require('./routes/adminroutes');

// Middleware - ALL LOWERCASE
const { errorHandler, notFound } = require('./middleware/errorhandler');

const app = express();

// Initialize services
connectDB();
initFirebase();
initCloudinary();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Health check
app.get('/', (req, res) => {
    res.json({ 
        message: 'VITNotes Hub API is running', 
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/admin', adminRoutes);

// Public stats endpoint
app.get('/api/stats/public', async (req, res, next) => {
    try {
        const User = require('./models/user');
        const Note = require('./models/note');
        
        const users = await User.countDocuments();
        const notes = await Note.countDocuments();
        const downloads = await Note.aggregate([
            { $group: { _id: null, total: { $sum: '$downloads' } } }
        ]);
        
        res.json({
            users,
            notes,
            downloads: downloads[0]?.total || 0
        });
    } catch (error) {
        next(error);
    }
});

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});
