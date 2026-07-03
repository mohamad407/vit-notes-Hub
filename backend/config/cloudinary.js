const cloudinary = require('cloudinary').v2;

const initCloudinary = () => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
    });
    
    console.log('️ Cloudinary configured');
};

const uploadPDF = async (fileBuffer, folder = 'vitnotes') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: 'raw',
                format: 'pdf',
                use_filename: true,
                unique_filename: true,
                overwrite: false
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        
        uploadStream.end(fileBuffer);
    });
};

const deletePDF = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
        return true;
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        return false;
    }
};

module.exports = { initCloudinary, uploadPDF, deletePDF };
