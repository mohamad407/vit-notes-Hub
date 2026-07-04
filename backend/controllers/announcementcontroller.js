const Announcement = require('../models/Announcement');

// Get latest active announcement (public)
const getLatestAnnouncement = async (req, res, next) => {
    try {
        const announcement = await Announcement.findOne({ isActive: true })
            .sort({ createdAt: -1 });

        res.json(announcement || { text: '' });
    } catch (error) {
        next(error);
    }
};

// Get all announcements (admin)
const getAllAnnouncements = async (req, res, next) => {
    try {
        const announcements = await Announcement.find()
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            announcements
        });
    } catch (error) {
        next(error);
    }
};

// Create announcement (admin)
const createAnnouncement = async (req, res, next) => {
    try {
        const { text } = req.body;

        if (!text || text.trim() === '') {
            return res.status(400).json({ error: 'Announcement text is required' });
        }

        // Deactivate all existing announcements
        await Announcement.updateMany({}, { isActive: false });

        const announcement = await Announcement.create({
            text: text.trim(),
            isActive: true,
            createdBy: req.user._id
        });

        res.status(201).json({
            success: true,
            announcement
        });
    } catch (error) {
        next(error);
    }
};

// Delete announcement (admin)
const deleteAnnouncement = async (req, res, next) => {
    try {
        const announcement = await Announcement.findById(req.params.id);

        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        await Announcement.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Announcement deleted'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getLatestAnnouncement,
    getAllAnnouncements,
    createAnnouncement,
    deleteAnnouncement
};
