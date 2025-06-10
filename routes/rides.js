const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Create new ride request
router.post('/', auth, async (req, res) => {
  try {
    const ride = new Ride({
      ...req.body,
      passenger: req.user._id
    });
    await ride.save();
    
    // Notify available drivers
    req.app.get('io').emit('newRideRequest', ride);
    
    res.status(201).json(ride);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user's rides
router.get('/my-rides', auth, async (req, res) => {
  try {
    const rides = await Ride.find({
      $or: [
        { passenger: req.user._id },
        { driver: req.user._id }
      ]
    })
    .populate('passenger', 'name phone')
    .populate('driver', 'name phone')
    .sort({ createdAt: -1 });
    
    res.json(rides);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get nearby ride requests (for drivers)
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
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    }).populate('passenger', 'name phone');
    
    res.json(rides);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Accept ride request
router.patch('/:id/accept', auth, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can accept rides' });
    }

    const ride = await Ride.findById(req.params.id);
    
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.status !== 'pending') {
      return res.status(400).json({ error: 'Ride is no longer available' });
    }

    ride.driver = req.user._id;
    ride.status = 'accepted';
    await ride.save();

    // Notify passenger
    req.app.get('io').to(`user_${ride.passenger}`).emit('rideAccepted', ride);
    
    res.json(ride);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update ride status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (req.user._id.toString() !== ride.driver.toString() && 
        req.user._id.toString() !== ride.passenger.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this ride' });
    }

    ride.status = req.body.status;
    await ride.save();

    // Notify all parties involved
    req.app.get('io').to(`ride_${ride._id}`).emit('rideStatusChanged', ride);
    
    res.json(ride);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Rate ride
router.post('/:id/rate', auth, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.status !== 'completed') {
      return res.status(400).json({ error: 'Can only rate completed rides' });
    }

    if (req.user._id.toString() !== ride.passenger.toString()) {
      return res.status(403).json({ error: 'Only passengers can rate rides' });
    }

    ride.rating = req.body.rating;
    ride.feedback = req.body.feedback;
    await ride.save();

    // Update driver's average rating
    const driver = await User.findById(ride.driver);
    const driverRides = await Ride.find({ driver: ride.driver, rating: { $exists: true } });
    const averageRating = driverRides.reduce((acc, ride) => acc + ride.rating, 0) / driverRides.length;
    
    driver.rating = averageRating;
    await driver.save();

    res.json(ride);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router; 