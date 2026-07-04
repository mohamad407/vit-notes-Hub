const User = require('../models/user');
const Note = require('../models/note');
const Announcement = require('../models/announcement');

// Get admin stats
const getStats = async (req, res, next) => {
    try {
        const users = await User.countDocuments();
        const notes = await Note.countDocuments();
        
        const downloadsAgg = await Note.aggregate([
            { $group: { _id: null, total: { $sum: '$downloads' } } }
        ]);

        res.json({
            success: true,
            users,
            notes,
            downloads: downloadsAgg[0]?.total || 0
        });
    } catch (error) {
        next(error);
    }
};

// Get all users
const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find()
            .select('-firebaseUid')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            users
        });
    } catch (error) {
        next(error);
    }
};

// Get all notes (admin view)
const getAllNotes = async (req, res, next) => {
    try {
        const notes = await Note.find()
            .populate('uploadedBy', 'name email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            notes
        });
    } catch (error) {
        next(error);
    }
};

// Delete any note (admin)
const adminDeleteNote = async (req, res, next) => {
    try {
        const note = await Note.findById(req.params.id);

        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        const { deletePDF } = require('../config/cloudinary');
        await deletePDF(note.pdfPublicId);
        await Note.findByIdAndDelete(req.params.id);

        await User.findByIdAndUpdate(note.uploadedBy, {
            $inc: { uploadCount: -1 }
        });

        res.json({
            success: true,
            message: 'Note deleted by admin'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getStats,
    getAllUsers,
    getAllNotes,
    adminDeleteNote
};
