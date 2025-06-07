const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');
const User = require('./models/User');
require('dotenv').config();

// Check environment variables
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Missing env vars:', missingEnvVars.join(', '));
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB error:', err);
    process.exit(1);
  });

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const rideRoutes = require('./routes/rides');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rides', rideRoutes);

// Socket.IO setup
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  socket.on('joinUserRoom', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Joined user room: user_${userId}`);
  });

  socket.on('joinRideRoom', (rideId) => {
    socket.join(`ride_${rideId}`);
    console.log(`Joined ride room: ride_${rideId}`);
  });

  socket.on('driverLocationUpdate', async ({ driverId, location, rideId }) => {
    try {
      await User.findByIdAndUpdate(driverId, {
        location: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        }
      });

      const payload = { driverId, location };

      if (rideId) {
        io.to(`ride_${rideId}`).emit('driverLocationChanged', payload);
      } else {
        socket.broadcast.emit('driverLocationChanged', payload);
      }
    } catch (err) {
      console.error('Location update error:', err);
      socket.emit('error', { message: 'Failed to update location' });
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
