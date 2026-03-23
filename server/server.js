const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const cron = require('node-cron');

// Load env vars
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chats');

// Import socket handler
const socketHandler = require('./socket/socketHandler');

// Import models for cron
const ScheduledMessage = require('./models/ScheduledMessage');
const Message = require('./models/Message');
const ChatRoom = require('./models/ChatRoom');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
  maxHttpBufferSize: 100 * 1024 * 1024, // 100MB for socket
});

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.CLIENT_URL,
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app')
    ) {
      callback(null, true)
    } else {
      callback(null, true)
    }
  },
  credentials: true,
  methods: ['GET','POST','PUT',
    'PATCH','DELETE','OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization'
  ]
}))
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ limit: '150mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log(`Attempting to connect to MongoDB at ${process.env.MONGO_URI}...`);
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 3000
    });
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('⚠️ Falling back to In-Memory MongoDB for development...');
    
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    await mongoose.connect(uri);
    console.log('✅ In-Memory MongoDB connected successfully');
  }

  // Store io on app for route access
  app.set('io', io);

  // Initialize socket handler
  socketHandler(io);

  // Scheduled messages cron job — runs every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const pendingMessages = await ScheduledMessage.find({
        scheduledAt: { $lte: now },
        sent: false,
      });

      for (const scheduled of pendingMessages) {
        // Create the actual message
        const message = await Message.create({
          sender: scheduled.sender,
          room: scheduled.room,
          content: scheduled.content,
          type: scheduled.type,
        });

        const populated = await Message.findById(message._id)
          .populate('sender', 'username avatar');

        // Update room's lastMessage
        await ChatRoom.findByIdAndUpdate(scheduled.room, {
          lastMessage: message._id,
        });

        // Emit via socket
        io.to(scheduled.room.toString()).emit('receive_message', populated);

        // Mark as sent
        scheduled.sent = true;
        await scheduled.save();
      }
    } catch (error) {
      console.error('Scheduled message cron error:', error);
    }
  });

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
