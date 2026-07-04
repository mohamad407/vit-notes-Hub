const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { verifyToken } = require('../middleware/auth');
const {
    uploadNote,
    getNotes,
    getMyNotes,
    getNoteById,
    downloadNote,
    deleteNote
} = require('../controllers/notecontroller');

// IMPORTANT: Protected routes MUST come BEFORE the /:id route
router.post('/upload', verifyToken, upload.single('pdf'), uploadNote);
router.get('/my-uploads', verifyToken, getMyNotes);
router.get('/:id/download', verifyToken, downloadNote);
router.delete('/:id', verifyToken, deleteNote);

// Public routes (these come LAST)
router.get('/', getNotes);
router.get('/:id', getNoteById);

module.exports = router;
