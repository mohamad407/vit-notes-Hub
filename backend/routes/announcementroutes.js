const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const {
    getLatestAnnouncement,
    getAllAnnouncements,
    createAnnouncement,
    deleteAnnouncement
} = require('../controllers/announcementController');

// Public - get latest
router.get('/latest', getLatestAnnouncement);

// Admin routes
router.get('/', verifyToken, isAdmin, getAllAnnouncements);
router.post('/', verifyToken, isAdmin, createAnnouncement);
router.delete('/:id', verifyToken, isAdmin, deleteAnnouncement);

module.exports = router;
