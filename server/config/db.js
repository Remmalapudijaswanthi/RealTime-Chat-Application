const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log(`Attempting to connect to MongoDB at ${process.env.MONGO_URI}...`);
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 3000 // fail fast if not available
    });
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('⚠️ Falling back to In-Memory MongoDB for development...');
    
    // Fallback to in-memory database
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    await mongoose.connect(uri);
    console.log('✅ In-Memory MongoDB connected successfully');
  }
};

module.exports = connectDB;
