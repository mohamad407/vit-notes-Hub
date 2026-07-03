const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firebaseUid: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        match: [/^[^\s@]+@vitstudent\.ac\.in$/, 'Must be a VIT student email']
    },
    photo: {
        type: String,
        default: ''
    },
    uploadCount: {
        type: Number,
        default: 0
    },
    role: {
        type: String,
        enum: ['student', 'admin'],
        default: 'student'
    },
    lastLogin: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ firebaseUid: 1 });

module.exports = mongoose.model('User', userSchema);
