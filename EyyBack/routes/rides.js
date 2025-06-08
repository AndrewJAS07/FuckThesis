const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Create new ride request
router.post('/', auth, async (req, res) => {
  try {
    // Prevent duplicate active rides
    const existing = await Ride.findOne({
      passenger: req.user._id,
      status: { $in: ['pending', 'accepted'] },
    });

    if (existing) {
      return res.status(400).json({
        error: 'You already have an active ride request.',
        rideId: existing._id,
      });
    }

    const ride = new Ride({
      ...req.body,
      passenger: req.user._id,
    });
    await ride.save();

    const io = req.app.get('io');
    if (io && typeof io.emit === 'function') {
      io.emit('newRideRequest', ride);
    } else {
      console.warn('⚠️ io or io.emit not available. Skipping emit.');
    }

    res.status(201).json(ride);
  } catch (error) {
    console.error('❌ Ride creation failed:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Get user's rides
router.get('/my-rides', auth, async (req, res) => {
  try {
    const rides = await Ride.find({
      $or: [{ passenger: req.user._id }, { driver: req.user._id }]
    })
      .populate('passenger', 'name phone')
      .populate('driver', 'name phone')
      .sort({ createdAt: -1 });

    res.json(rides);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Nearby rides (for drivers)
router.get('/nearby', auth, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can view nearby rides' });
    }

    const { latitude, longitude, maxDistance = 5000 } = req.query;

    const rides = await Ride.find({
      status: 'pending',
      pickupLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: parseInt(maxDistance),
        }
      }
    }).populate('passenger', 'name phone');

    res.json(rides);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Accept ride
router.patch('/:id/accept', auth, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can accept rides' });
    }

    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.status !== 'pending') return res.status(400).json({ error: 'Ride already accepted' });

    ride.driver = req.user._id;
    ride.status = 'accepted';
    await ride.save();

    const io = req.app.get('io');
    if (io && typeof io.to === 'function') {
      io.to(`user_${ride.passenger}`).emit('rideAccepted', ride);
    }

    res.json(ride);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update ride status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    if (
      req.user._id.toString() !== ride.driver?.toString() &&
      req.user._id.toString() !== ride.passenger?.toString()
    ) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    ride.status = req.body.status;
    await ride.save();

    const io = req.app.get('io');
    if (io && typeof io.to === 'function') {
      io.to(`ride_${ride._id}`).emit('rideStatusChanged', ride);
    }

    res.json(ride);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Rate a ride
router.post('/:id/rate', auth, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    if (ride.status !== 'completed') {
      return res.status(400).json({ error: 'Ride not completed' });
    }

    if (req.user._id.toString() !== ride.passenger.toString()) {
      return res.status(403).json({ error: 'Only passengers can rate rides' });
    }

    ride.rating = req.body.rating;
    ride.feedback = req.body.feedback;
    await ride.save();

    const driver = await User.findById(ride.driver);
    const driverRides = await Ride.find({ driver: ride.driver, rating: { $exists: true } });
    const avg = driverRides.reduce((acc, r) => acc + r.rating, 0) / driverRides.length;

    driver.rating = avg;
    await driver.save();

    res.json(ride);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
