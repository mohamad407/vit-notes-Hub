const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        
        // Create indexes
     const User = require('../models/user');
const Note = require('../models/note');
const Announcement = require('../models/announcement');
        await User.createIndexes();
        await Note.createIndexes();
        await Announcement.createIndexes();
        
        console.log('📊 Database indexes created');
    } catch (error) {
        console.error(`❌ MongoDB Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = { connectDB };
