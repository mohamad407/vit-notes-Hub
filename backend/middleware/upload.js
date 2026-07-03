const multer = require('multer');
const path = require('path');

// Memory storage for processing
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Only allow PDF
    if (file.mimetype !== 'application/pdf') {
        return cb(new Error('Only PDF files are allowed'), false);
    }
    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

module.exports = upload;
