const { PDFDocument } = require('pdf-lib');

/**
 * Compress PDF by removing metadata and optimizing
 * Returns compressed buffer
 */
const compressPDF = async (buffer) => {
    try {
        // Load the PDF
        const pdfDoc = await PDFDocument.load(buffer, { 
            ignoreEncryption: true 
        });
        
        // Remove metadata to reduce size
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setKeywords([]);
        pdfDoc.setProducer('');
        pdfDoc.setCreator('');
        
        // Save with compression
        const compressedBytes = await pdfDoc.save({
            useObjectStreams: true,
            addDefaultPage: false,
            objectsPerTick: 50
        });
        
        return Buffer.from(compressedBytes);
    } catch (error) {
        console.error('PDF compression error:', error);
        throw new Error('Failed to compress PDF. The file may be corrupted or password-protected.');
    }
};

/**
 * Check if PDF is valid and not password-protected
 */
const validatePDF = async (buffer) => {
    try {
        await PDFDocument.load(buffer, { ignoreEncryption: false });
        return true;
    } catch (error) {
        if (error.message.includes('password') || error.message.includes('encrypted')) {
            throw new Error('Password-protected PDFs are not allowed');
        }
        throw new Error('Invalid or corrupted PDF file');
    }
};

module.exports = { compressPDF, validatePDF };
