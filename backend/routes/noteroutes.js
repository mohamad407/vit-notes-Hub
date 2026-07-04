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

// Public routes
router.get('/', getNotes);
router.get('/:id', getNoteById);

// Protected routes
router.post('/upload', verifyToken, upload.single('pdf'), uploadNote);
router.get('/my-uploads', verifyToken, getMyNotes);
router.get('/:id/download', verifyToken, downloadNote);
router.delete('/:id', verifyToken, deleteNote);

module.exports = router;
