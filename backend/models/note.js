const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    courseCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    courseName: {
        type: String,
        required: true,
        trim: true
    },
    facultyName: {
        type: String,
        required: true,
        trim: true
    },
    department: {
        type: String,
        required: true,
        enum: ['SCOPE', 'SAS', 'V-SIGN', 'SENSE', 'SBST']
    },
    semester: {
        type: String,
        required: true,
        enum: ['1', '2', '3', '4', '5', '6', '7', '8']
    },
    term: {
        type: String,
        required: true,
        enum: ['Fall', 'Winter']
    },
    academicYear: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    pdfUrl: {
        type: String,
        required: true
    },
    pdfPublicId: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    downloads: {
        type: Number,
        default: 0
    },
    views: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes for search
noteSchema.index({ courseCode: 'text', courseName: 'text', facultyName: 'text' });
noteSchema.index({ department: 1, semester: 1 });
noteSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Note', noteSchema);
