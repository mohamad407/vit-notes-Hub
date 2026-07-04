const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const {
    getStats,
    getAllUsers,
    getAllNotes,
    adminDeleteNote
} = require('../controllers/admincontroller');

// All admin routes require auth + admin role
router.use(verifyToken, isAdmin);

router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.get('/notes', getAllNotes);
router.delete('/notes/:id', adminDeleteNote);

module.exports = router;
