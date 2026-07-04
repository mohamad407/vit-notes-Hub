const Note = require('../models/note');
const User = require('../models/user');
const { uploadPDF, deletePDF } = require('../config/cloudinary');
const { compressPDF, validatePDF } = require('../utils/pdfCompressor');

// Upload a new note
const uploadNote = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        const { 
            courseCode, courseName, facultyName, department, 
            semester, term, academicYear, description 
        } = req.body;

        // Validate required fields
        if (!courseCode || !courseName || !facultyName || !department || !semester || !term || !academicYear) {
            return res.status(400).json({ error: 'All required fields must be filled' });
        }

        let fileBuffer = req.file.buffer;
        const originalSize = fileBuffer.length;

        // Validate PDF
        await validatePDF(fileBuffer);

        // Compress if over 50MB
        if (originalSize > 50 * 1024 * 1024) {
            try {
                fileBuffer = await compressPDF(fileBuffer);
                
                if (fileBuffer.length > 50 * 1024 * 1024) {
                    return res.status(400).json({ 
                        error: 'File still exceeds 50MB after compression. Please upload a smaller file.' 
                    });
                }
            } catch (error) {
                return res.status(400).json({ error: error.message });
            }
        }

        // Upload to Cloudinary
        const uploadResult = await uploadPDF(fileBuffer, 'vitnotes');

        // Create note
        const note = await Note.create({
            courseCode,
            courseName,
            facultyName,
            department,
            semester,
            term,
            academicYear,
            description: description || '',
            pdfUrl: uploadResult.secure_url,
            pdfPublicId: uploadResult.public_id,
            fileSize: fileBuffer.length,
            uploadedBy: req.user._id
        });

        // Update user upload count
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { uploadCount: 1 }
        });

        res.status(201).json({
            success: true,
            note
        });
    } catch (error) {
        next(error);
    }
};

// Get all notes (with search, filter, pagination)
const getNotes = async (req, res, next) => {
    try {
        const { 
            page = 1, 
            limit = 9, 
            search = '',
            department,
            semester
        } = req.query;

        const query = {};

        // Search
        if (search) {
            query.$text = { $search: search };
        }

        // Filters
        if (department) query.department = department;
        if (semester) query.semester = semester;

        const notes = await Note.find(query)
            .populate('uploadedBy', 'name email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Note.countDocuments(query);

        res.json({
            success: true,
            notes,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get user's uploads
const getMyNotes = async (req, res, next) => {
    try {
        const notes = await Note.find({ uploadedBy: req.user._id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            notes
        });
    } catch (error) {
        next(error);
    }
};

// Get single note
const getNoteById = async (req, res, next) => {
    try {
        const note = await Note.findById(req.params.id)
            .populate('uploadedBy', 'name email');

        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        // Increment views
        note.views += 1;
        await note.save();

        res.json({
            success: true,
            note
        });
    } catch (error) {
        next(error);
    }
};

// Download note
const downloadNote = async (req, res, next) => {
    try {
        const note = await Note.findById(req.params.id);

        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        // Increment downloads
        note.downloads += 1;
        await note.save();

        res.json({
            success: true,
            downloadUrl: note.pdfUrl
        });
    } catch (error) {
        next(error);
    }
};

// Delete note
const deleteNote = async (req, res, next) => {
    try {
        const note = await Note.findById(req.params.id);

        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        // Check ownership or admin
        if (note.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to delete this note' });
        }

        // Delete from Cloudinary
        await deletePDF(note.pdfPublicId);

        // Delete from database
        await Note.findByIdAndDelete(req.params.id);

        // Decrement user upload count
        await User.findByIdAndUpdate(note.uploadedBy, {
            $inc: { uploadCount: -1 }
        });

        res.json({
            success: true,
            message: 'Note deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    uploadNote,
    getNotes,
    getMyNotes,
    getNoteById,
    downloadNote,
    deleteNote
};
