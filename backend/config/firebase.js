const admin = require('firebase-admin');

let firebaseApp = null;

const initFirebase = () => {
    if (admin.apps.length > 0) {
        firebaseApp = admin.app();
        console.log('✅ Firebase already initialized');
        return firebaseApp;
    }

    try {
        // Parse private key (handle escaped newlines)
        const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
        
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey
        };

        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        console.log('✅ Firebase Admin SDK initialized');
        return firebaseApp;
    } catch (error) {
        console.error('❌ Firebase initialization error:', error.message);
        throw error;
    }
};

const getAuth = () => {
    if (!firebaseApp) {
        throw new Error('Firebase not initialized');
    }
    return admin.auth();
};

module.exports = { initFirebase, getAuth };
