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

// Protected routes - MUST come BEFORE /:id
router.post('/upload', verifyToken, upload.single('pdf'), uploadNote);
router.get('/my-uploads', verifyToken, getMyNotes);
router.delete('/:id', verifyToken, deleteNote);
router.get('/:id/download', verifyToken, downloadNote);

// Public routes (come LAST)
router.get('/', getNotes);
router.get('/:id', getNoteById);

module.exports = router;
