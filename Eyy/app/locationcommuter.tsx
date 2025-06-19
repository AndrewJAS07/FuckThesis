import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, TouchableOpacity, TextInput, Alert, ActivityIndicator, Linking, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { PathFinder, Point } from '../utils/pathfinding';
import { rideAPI } from '../lib/api';
import { MaterialIcons } from '@expo/vector-icons';
import LocationPicker from '../utils/LocationPicker';
import GooglePlacesAutocomplete from '../utils/GooglePlacesAutocomplete';
import { RouteMap } from '../utils/RouteMap';
import GoogleDirections from '../utils/GoogleDirections';
import { TRAVEL_MODES, GOOGLE_MAPS_API_KEY } from '../lib/google-maps-config';

interface Location extends Point {
  name?: string;
  address?: string;
  heading?: number;
  instruction?: string;
  distance?: number;
  timestamp?: number;
  accuracy?: number | null;
}

interface SearchResult {
  lat: number;
  lon: number;
  display_name: string;
}

interface TurnInfo {
  instruction: string;
  distance: number;
}

interface RideRequest {
  pickupLocation: {
    type: string;
    coordinates: [number, number];
    address: string;
  };
  dropoffLocation: {
    type: string;
    coordinates: [number, number];
    address: string;
  };
  fare: number;
  distance: number;
  duration: number;
  paymentMethod: string;
  status: string;
}

// Payment method options
const PAYMENT_METHODS = [
  {
    id: 'cash',
    name: 'Cash',
    icon: 'cash-outline',
    description: 'Pay with cash after the ride'
  },
  {
    id: 'gcash',
    name: 'GCash',
    icon: 'phone-portrait-outline',
    description: 'Pay using GCash mobile wallet'
  },
  {
    id: 'paymaya',
    name: 'PayMaya',
    icon: 'card-outline',
    description: 'Pay using PayMaya wallet'
  },
  {
    id: 'credit_card',
    name: 'Credit/Debit Card',
    icon: 'card-outline',
    description: 'Pay with credit or debit card'
  }
];

// Naga City boundaries
const NAGA_CITY_BOUNDS = {
  north: 13.6500, // Northern boundary
  south: 13.5800, // Southern boundary
  east: 123.2000,  // Eastern boundary
  west: 123.1500,  // Western boundary
};

// Naga City center coordinates
const NAGA_CITY_CENTER = {
  latitude: 13.6195,
  longitude: 123.1814,
};

// Zoom levels for different scenarios
const ZOOM_LEVELS = {
  USER_LOCATION: 16, // Closer zoom for user location
  DESTINATION: 15,   // Slightly wider for showing destination
  CITY_OVERVIEW: 13  // Overview of Naga City
};

// Location accuracy settings
const LOCATION_SETTINGS = {
  HIGH_ACCURACY: {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 1000, // More frequent updates
    distanceInterval: 1, // Update every meter
  },
  BALANCED_ACCURACY: {
    accuracy: Location.Accuracy.High,
    timeInterval: 2000,
    distanceInterval: 2,
  },
  MIN_ACCURACY_THRESHOLD: 5, // Stricter accuracy threshold (5 meters)
  MAX_ACCURACY_THRESHOLD: 30, // Lower max threshold for better accuracy
  CALIBRATION_SAMPLES: 10, // More samples for better accuracy
  CALIBRATION_INTERVAL: 300, // Shorter interval between samples
};

export default function LocationCommuter() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);
  const pathFinder = useRef(new PathFinder()).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // Test coordinates for current location
  // You can modify these coordinates for testing different locations
  // Current test location: SM City Naga
  const TEST_COORDINATES = {
    latitude: 13.6195,
    longitude: 123.1814,
    address: "SM City Naga"
  };

  // Comment out the line below to use real location
  const [currentLocation, setCurrentLocation] = useState<Location>(NAGA_CITY_CENTER);
  // Uncomment the line below to use test coordinates
  //const [currentLocation, setCurrentLocation] = useState<Location>(TEST_COORDINATES);

  const [destination, setDestination] = useState<Location | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [searchCache, setSearchCache] = useState<Record<string, Location>>({});
  const [searchError, setSearchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const MAX_CACHE_SIZE = 50; // Maximum number of cached locations
  const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes in milliseconds
  const [region, setRegion] = useState({
    latitude: NAGA_CITY_CENTER.latitude,
    longitude: NAGA_CITY_CENTER.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pathCoordinates, setPathCoordinates] = useState<Point[]>([]);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<number>(0);
  const LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds
  const [isBooking, setIsBooking] = useState(false);
  const [isRiderView, setIsRiderView] = useState(false);
  const [mapStyle, setMapStyle] = useState('standard');
  const [showTraffic, setShowTraffic] = useState(false);
  const [navigationMode, setNavigationMode] = useState<'follow' | 'overview'>('follow');
  const [nextTurn, setNextTurn] = useState<TurnInfo | null>(null);
  const [remainingDistance, setRemainingDistance] = useState<number>(0);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [fare, setFare] = useState<number>(0);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [showWaitingModal, setShowWaitingModal] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<{
    rideId: string;
    pickupAddress: string;
    destinationAddress: string;
    fare: number;
    distance: number;
    estimatedTime: number;
  } | null>(null);
  const [travelMode, setTravelMode] = useState(TRAVEL_MODES.DRIVING);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash');

  // Add cache cleaning function
  const cleanCache = () => {
    const now = Date.now();
    const newCache: Record<string, Location> = {};
    let count = 0;

    // Sort cache entries by timestamp (if available) and keep only the most recent ones
    Object.entries(searchCache)
      .sort(([, a], [, b]) => {
        const timeA = (a as any).timestamp || 0;
        const timeB = (b as any).timestamp || 0;
        return timeB - timeA;
      })
      .forEach(([key, value]) => {
        if (count < MAX_CACHE_SIZE) {
          newCache[key] = value;
          count++;
        }
      });

    setSearchCache(newCache);
    console.log('Cache cleaned. New cache size:', Object.keys(newCache).length);
  };

  // Handle location selection from LocationPicker
  const handleLocationSelect = (location: Location) => {
    setDestination(location);
    setSearchText(location.address || 'Selected Location');
    setSearchError(null);
    
    // Update map region to show the selected location
    updateMapRegion(location);
    
    // Calculate route using Google Directions
    if (currentLocation) {
      calculateRoute(currentLocation, location);
    }
  };

  // Handle place selection from Google Places Autocomplete
  const handlePlaceSelect = async (place: any, details: any) => {
    if (details?.geometry?.location) {
      const location: Location = {
        latitude: details.geometry.location.lat,
        longitude: details.geometry.location.lng,
        address: place.description,
        timestamp: Date.now(),
      };

      setDestination(location);
      setSearchText(place.description);
      setSearchError(null);
      
      // Update map region
      updateMapRegion(location);
      
      // Calculate route
      if (currentLocation) {
        calculateRoute(currentLocation, location);
      }
    }
  };

  // Calculate route using Google Directions
  const calculateRoute = async (origin: Location, dest: Location) => {
    try {
      setIsLoading(true);
      setSearchError(null);

      // Use Google Directions API
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destinationStr = `${dest.latitude},${dest.longitude}`;

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&mode=${travelMode}&key=${GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();

      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        
        // Decode polyline to get route coordinates
        const coordinates = decodePolyline(route.overview_polyline.points);
        setPathCoordinates(coordinates);
        
        // Update route information
        setRouteInfo(route);
        setTotalDistance(leg.distance.value);
        setEstimatedTime(leg.duration.value / 60); // Convert to minutes
        setFare(calculateEstimatedFare(origin, dest));
        
        // Fit map to show the entire route
        if (mapRef.current) {
          mapRef.current.fitToCoordinates(
            coordinates,
            {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true,
            }
          );
        }
      } else {
        // Fallback to straight line path
        const fallbackPath = [
          { latitude: origin.latitude, longitude: origin.longitude },
          { latitude: dest.latitude, longitude: dest.longitude }
        ];
        setPathCoordinates(fallbackPath);
        const distance = calculateDistance(origin, dest);
        setTotalDistance(distance);
        setEstimatedTime(distance / 1000 / 15 * 60); // Assuming 15 km/h average speed
        setFare(calculateEstimatedFare(origin, dest));
        
        setSearchError('Using direct route due to routing limitations.');
      }
    } catch (error) {
      console.error('Route calculation error:', error);
      setSearchError('Failed to calculate route. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Decode Google polyline
  const decodePolyline = (encoded: string) => {
    const poly = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let shift = 0, result = 0;

      do {
        let b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (result >= 0x20);

      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        let b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (result >= 0x20);

      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push({
        latitude: lat / 1E5,
        longitude: lng / 1E5,
      });
    }

    return poly;
  };

  // Create ride request using the API
  const createRideRequest = async () => {
    if (!currentLocation || !destination || isLoading || isBooking) return;

    // Show payment method selection modal first
    setShowPaymentModal(true);
  };

  // Handle actual ride creation after payment method selection
  const handleRideCreation = async () => {
    if (!currentLocation || !destination || isLoading || isBooking) return;

    try {
      setIsBooking(true);
      setShowPaymentModal(false);

      // Basic validations
      if (!currentLocation || !destination) {
        throw new Error('Invalid location data');
      }

      if (
        isNaN(currentLocation.latitude) || isNaN(currentLocation.longitude) ||
        isNaN(destination.latitude) || isNaN(destination.longitude)
      ) {
        throw new Error('Invalid coordinates');
      }

      // Validate and calculate required values
      const calculatedDistance = totalDistance > 0 ? totalDistance : calculateDistance(currentLocation, destination);
      const calculatedFare = fare > 0 ? fare : calculateEstimatedFare(currentLocation, destination);
      const calculatedDuration = estimatedTime > 0 ? Math.round(estimatedTime * 60) : Math.round((calculatedDistance / 1000) * 3 * 60); // 3 min per km

      // Additional validation for required fields
      if (calculatedDistance <= 0) {
        throw new Error('Invalid distance calculation');
      }

      if (calculatedFare <= 0) {
        throw new Error('Invalid fare calculation');
      }

      if (calculatedDuration <= 0) {
        throw new Error('Invalid duration calculation');
      }

      if (!selectedPaymentMethod) {
        throw new Error('Payment method is required');
      }

      // Prepare ride request data
      const rideRequest: RideRequest = {
        pickupLocation: {
          type: 'Point',
          coordinates: [currentLocation.longitude, currentLocation.latitude],
          address: currentLocation.address || 'Current Location'
        },
        dropoffLocation: {
          type: 'Point',
          coordinates: [destination.longitude, destination.latitude],
          address: destination.address || searchText || 'Selected Destination'
        },
        fare: calculatedFare,
        distance: calculatedDistance,
        duration: calculatedDuration,
        paymentMethod: selectedPaymentMethod,
        status: 'pending'
      };

      console.log('Creating ride request with validated data:', {
        fare: calculatedFare,
        distance: calculatedDistance,
        duration: calculatedDuration,
        paymentMethod: selectedPaymentMethod,
        pickup: rideRequest.pickupLocation,
        dropoff: rideRequest.dropoffLocation
      });

      // Call the API to create the ride
      const rideResponse = await rideAPI.createRide(rideRequest);

      console.log('Ride created successfully:', rideResponse);

      // Set booking details for the waiting modal
      setBookingDetails({
        rideId: rideResponse.id,
        pickupAddress: rideRequest.pickupLocation.address,
        destinationAddress: rideRequest.dropoffLocation.address,
        fare: rideRequest.fare,
        distance: rideRequest.distance,
        estimatedTime: rideRequest.duration / 60 // Convert back to minutes
      });

      // Show waiting modal
      setShowWaitingModal(true);

      // Navigate to booking page with ride details
      router.push({
        pathname: '/booking',
        params: {
          rideId: rideResponse.id,
          pickupLat: currentLocation.latitude.toString(),
          pickupLng: currentLocation.longitude.toString(),
          pickupAddress: rideRequest.pickupLocation.address,
          destLat: destination.latitude.toString(),
          destLng: destination.longitude.toString(),
          destAddress: rideRequest.dropoffLocation.address,
          distance: rideRequest.distance.toString(),
          fare: rideRequest.fare.toString(),
          estimatedTime: rideRequest.duration.toString(),
          paymentMethod: selectedPaymentMethod,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Ride creation error:', error);
      Alert.alert(
        'Booking Error',
        error instanceof Error ? error.message : 'Failed to create ride request. Please try again.'
      );
    } finally {
      setIsBooking(false);
    }
  };

  const updateMapRegion = (newDestination: Location) => {
    const centerLat = (currentLocation.latitude + newDestination.latitude) / 2;
    const centerLon = (currentLocation.longitude + newDestination.longitude) / 2;
    
    // Calculate appropriate zoom level based on distance
    const distance = calculateDistance(currentLocation, newDestination);
    const zoomLevel = distance > 2000 ? ZOOM_LEVELS.CITY_OVERVIEW : ZOOM_LEVELS.DESTINATION;
    
    const newRegion = {
      latitude: centerLat,
      longitude: centerLon,
      latitudeDelta: Math.abs(currentLocation.latitude - newDestination.latitude) * 1.5,
      longitudeDelta: Math.abs(currentLocation.longitude - newDestination.longitude) * 1.5,
    };
    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 300);
  };

  const calculateDistance = (loc1: Location, loc2: Location): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = loc1.latitude * Math.PI/180;
    const φ2 = loc2.latitude * Math.PI/180;
    const Δφ = (loc2.latitude - loc1.latitude) * Math.PI/180;
    const Δλ = (loc2.longitude - loc1.longitude) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const isWithinNagaCity = (location: Location): boolean => {
    return (
      location.latitude >= NAGA_CITY_BOUNDS.south &&
      location.latitude <= NAGA_CITY_BOUNDS.north &&
      location.longitude >= NAGA_CITY_BOUNDS.west &&
      location.longitude <= NAGA_CITY_BOUNDS.east
    );
  };

  const calculateEstimatedFare = (start: Location, end: Location): number => {
    const distance = calculateDistance(start, end);
    const baseFare = 15; // Base fare in pesos
    const perKmRate = 5; // Rate per kilometer
    const minimumFare = 15; // Minimum fare in pesos
    
    const fare = baseFare + (distance / 1000 * perKmRate); // Convert meters to kilometers
    return Math.max(fare, minimumFare);
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      
      // Request location permissions with better error handling
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location services to use this feature. You can enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      // Get initial location with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
      });

      // Validate location data
      if (!location.coords || 
          typeof location.coords.latitude !== 'number' || 
          typeof location.coords.longitude !== 'number') {
        throw new Error('Invalid location data received');
      }

      const newLocation: Location = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        heading: location.coords.heading || undefined,
        address: "Current Location",
        timestamp: Date.now()
      };

      // Check if location is within Naga City
      if (!isWithinNagaCity(newLocation)) {
        Alert.alert(
          'Location Out of Range',
          'You must be within Naga City to use this service.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Update current location state
      setCurrentLocation(newLocation);
      setLocationAccuracy(location.coords.accuracy);
      
      // Zoom to user location
      const newRegion = {
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        latitudeDelta: 0.005, // Closer zoom for better visibility
        longitudeDelta: 0.005,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);

      // Start watching location with high accuracy
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          const newLocation: Location = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            heading: location.coords.heading || undefined,
            timestamp: Date.now()
          };

          // Only update if location is within Naga City and has good accuracy
          if (isWithinNagaCity(newLocation) && 
              location.coords.accuracy && 
              location.coords.accuracy <= LOCATION_SETTINGS.MAX_ACCURACY_THRESHOLD) {
            setCurrentLocation(newLocation);
            setLocationAccuracy(location.coords.accuracy);
          }
        }
      );

    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your current location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getCurrentLocation();
    startPulseAnimation();

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  // Add cache cleaning on component mount
  useEffect(() => {
    cleanCache();
  }, []);

  // Add cache cleaning when component unmounts
  useEffect(() => {
    return () => {
      cleanCache();
    };
  }, []);

  // Function to calculate next turn information
  const calculateNextTurn = (path: Point[], currentIndex: number): TurnInfo | null => {
    if (currentIndex >= path.length - 2) {
      return null;
    }

    const current = path[currentIndex];
    const next = path[currentIndex + 1];
    const nextNext = path[currentIndex + 2];

    // Calculate bearing between points
    const bearing1 = calculateBearing(current, next);
    const bearing2 = calculateBearing(next, nextNext);
    const angleDiff = (bearing2 - bearing1 + 360) % 360;

    // Calculate distance to next turn
    const distance = calculateDistance(current, next);

    // Determine turn instruction
    let instruction = 'Continue straight';
    if (angleDiff > 30 && angleDiff <= 150) {
      instruction = 'Turn right';
    } else if (angleDiff > 150 && angleDiff <= 210) {
      instruction = 'Turn around';
    } else if (angleDiff > 210 && angleDiff <= 330) {
      instruction = 'Turn left';
    }

    return {
      instruction,
      distance
    };
  };

  // Function to calculate bearing between two points
  const calculateBearing = (start: Point, end: Point): number => {
    const startLat = start.latitude * Math.PI / 180;
    const startLng = start.longitude * Math.PI / 180;
    const endLat = end.latitude * Math.PI / 180;
    const endLng = end.longitude * Math.PI / 180;

    const y = Math.sin(endLng - startLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
              Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360;
    
    return bearing;
  };

  // Function to handle map style change
  const handleMapStyleChange = (style: string) => {
    setMapStyle(style);
  };

  // Function to toggle rider's view
  const toggleRiderView = () => {
    setIsRiderView(!isRiderView);
    if (!isRiderView) {
      // When switching to rider view, adjust the map to follow the rider
      mapRef.current?.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.005, // Closer zoom for rider view
        longitudeDelta: 0.005,
      }, 1000);
    }
  };

  // Function to find closest point on path
  const findClosestPointIndex = (point: Point, path: Point[]): number => {
    let minDistance = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < path.length; i++) {
      const distance = calculateDistance(point, path[i]);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    return closestIndex;
  };

  // Update location tracking to include navigation updates
  useEffect(() => {
    if (isRiderView && pathCoordinates.length > 0) {
      // Find closest point on path
      const currentIndex = findClosestPointIndex(currentLocation, pathCoordinates);
      
      // Calculate next turn
      const turnInfo = calculateNextTurn(pathCoordinates, currentIndex);
      setNextTurn(turnInfo);

      // Calculate remaining distance
      let remainingDist = 0;
      for (let i = currentIndex; i < pathCoordinates.length - 1; i++) {
        remainingDist += calculateDistance(pathCoordinates[i], pathCoordinates[i + 1]);
      }
      setRemainingDistance(remainingDist);

      // Estimate time (assuming average speed of 15 km/h)
      const estimatedTimeMinutes = (remainingDist / 1000) / 15 * 60;
      setEstimatedTime(estimatedTimeMinutes);
    }
  }, [currentLocation, isRiderView, pathCoordinates]);

  // Add the WaitingModal component
  const WaitingModal = () => (
    <Modal
      visible={showWaitingModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowWaitingModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Waiting for Rider</Text>
            <ActivityIndicator size="large" color="#0d4217" />
          </View>

          <View style={styles.bookingInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={24} color="#0d4217" />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Pickup</Text>
                <Text style={styles.infoValue}>{bookingDetails?.pickupAddress}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="flag" size={24} color="#e74c3c" />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Destination</Text>
                <Text style={styles.infoValue}>{bookingDetails?.destinationAddress}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="cash" size={24} color="#0d4217" />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Fare</Text>
                <Text style={styles.infoValue}>₱{bookingDetails?.fare.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="time" size={24} color="#0d4217" />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Estimated Time</Text>
                <Text style={styles.infoValue}>{bookingDetails?.estimatedTime} minutes</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setShowWaitingModal(false);
              router.push("/(commuter)/dashboardcommuter");
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel Booking</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Add the PaymentMethodModal component
  const PaymentMethodModal = () => (
    <Modal
      visible={showPaymentModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowPaymentModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Payment Method</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPaymentModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.paymentMethodsContainer}>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethodItem,
                  selectedPaymentMethod === method.id && styles.selectedPaymentMethod
                ]}
                onPress={() => setSelectedPaymentMethod(method.id)}
              >
                <View style={styles.paymentMethodContent}>
                  <Ionicons 
                    name={method.icon as any} 
                    size={24} 
                    color={selectedPaymentMethod === method.id ? "#fff" : "#0d4217"} 
                  />
                  <View style={styles.paymentMethodText}>
                    <Text style={[
                      styles.paymentMethodName,
                      selectedPaymentMethod === method.id && styles.selectedPaymentText
                    ]}>
                      {method.name}
                    </Text>
                    <Text style={[
                      styles.paymentMethodDescription,
                      selectedPaymentMethod === method.id && styles.selectedPaymentText
                    ]}>
                      {method.description}
                    </Text>
                  </View>
                </View>
                {selectedPaymentMethod === method.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.paymentSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Distance:</Text>
              <Text style={styles.summaryValue}>{(totalDistance / 1000).toFixed(1)} km</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Estimated Time:</Text>
              <Text style={styles.summaryValue}>{Math.round(estimatedTime)} min</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Fare:</Text>
              <Text style={styles.totalValue}>₱{fare.toFixed(2)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.confirmButton,
              (!selectedPaymentMethod || isBooking) && styles.confirmButtonDisabled
            ]}
            onPress={handleRideCreation}
            disabled={!selectedPaymentMethod || isBooking}
          >
            <Text style={styles.confirmButtonText}>
              {isBooking ? 'CREATING RIDE...' : 'CONFIRM RIDE'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.push("/(commuter)/dashboardcommuter")} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <TouchableOpacity
            style={styles.searchInputContainer}
            onPress={() => setShowLocationPicker(true)}
          >
            <Ionicons name="location-outline" size={20} color="#0d4217" />
            <Text style={[styles.searchInputText, !destination && styles.placeholder]}>
              {destination ? destination.address : 'Where do you want to go?'}
            </Text>
            {isLoading && (
              <ActivityIndicator size="small" color="#0d4217" style={styles.searchLoading} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Message */}
      {searchError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{searchError}</Text>
        </View>
      )}

      {/* Map Content */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          showsUserLocation
          showsMyLocationButton
          showsCompass
          showsScale
          showsTraffic={showTraffic}
          mapType={mapStyle === 'satellite' ? 'satellite' : 'standard'}
          initialRegion={region}
          onRegionChangeComplete={setRegion}
        >
          {/* Current Location Marker */}
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title="Your Location"
            description={locationAccuracy ? `Accuracy: ${Math.round(locationAccuracy)}m` : undefined}
          >
            <Animated.View 
              style={[
                styles.currentLocationMarker,
                {
                  transform: [{ scale: pulseAnim }]
                }
              ]}
            >
              <View style={styles.markerDot} />
              <Ionicons name="location" size={30} color="#0d4217" />
            </Animated.View>
          </Marker>

          {/* Destination Marker */}
          {destination && (
            <Marker
              coordinate={{
                latitude: destination.latitude,
                longitude: destination.longitude,
              }}
              title="Destination"
            >
              <View style={styles.destinationMarker}>
                <Ionicons name="flag" size={30} color="#FF0000" />
              </View>
            </Marker>
          )}

          {/* Road-following Polyline */}
          {pathCoordinates.length > 0 && (
            <Polyline
              coordinates={pathCoordinates}
              strokeWidth={4}
              strokeColor="#0d4217"
              lineDashPattern={[1]}
              zIndex={1}
            />
          )}
        </MapView>

        {/* Navigation Info */}
        {isRiderView && nextTurn && (
          <View style={styles.navigationInfo}>
            <Text style={styles.turnInstruction}>{nextTurn.instruction}</Text>
            <Text style={styles.distanceInfo}>
              {Math.round(nextTurn.distance)}m • {Math.round(remainingDistance)}m remaining
            </Text>
            <Text style={styles.timeInfo}>
              Est. arrival: {Math.round(estimatedTime)} min
            </Text>
          </View>
        )}
      </View>

      {/* Route Information */}
      {destination && routeInfo && (
        <View style={styles.routeInfoContainer}>
          <GoogleDirections
            origin={currentLocation}
            destination={destination}
            travelMode={travelMode}
            onRouteReceived={setRouteInfo}
            showRouteInfo={true}
            onNavigate={() => {
              // Handle navigation
              const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.latitude},${currentLocation.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=${travelMode}`;
              Linking.openURL(url);
            }}
          />
        </View>
      )}

      {/* Choose Button */}
      <TouchableOpacity 
        style={[
          styles.chooseButton, 
          (!destination || isLoading || isBooking) && styles.chooseButtonDisabled
        ]}
        onPress={createRideRequest}
        disabled={!destination || isLoading || isBooking}
      >
        <Text style={styles.chooseButtonText}>
          {isBooking ? 'CREATING RIDE...' : 
           isLoading ? 'LOADING...' : 
           destination ? 'REQUEST RIDE' : 
           'SELECT A DESTINATION'}
        </Text>
      </TouchableOpacity>

      {/* Rider controls overlay */}
      <View style={styles.controlsOverlay}>
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={[styles.controlButton, isRiderView && styles.activeControlButton]}
            onPress={toggleRiderView}
          >
            <MaterialIcons
              name={isRiderView ? "directions-bike" : "map"}
              size={24}
              color={isRiderView ? "#FFFFFF" : "#000000"}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, mapStyle === 'satellite' && styles.activeControlButton]}
            onPress={() => handleMapStyleChange(mapStyle === 'satellite' ? 'standard' : 'satellite')}
          >
            <MaterialIcons
              name={mapStyle === 'satellite' ? "terrain" : "satellite"}
              size={24}
              color={mapStyle === 'satellite' ? "#FFFFFF" : "#000000"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, showTraffic && styles.activeControlButton]}
            onPress={() => setShowTraffic(!showTraffic)}
          >
            <MaterialIcons
              name="traffic"
              size={24}
              color={showTraffic ? "#FFFFFF" : "#000000"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Destination</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowLocationPicker(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <GooglePlacesAutocomplete
              placeholder="Search for places..."
              onPlaceSelected={handlePlaceSelect}
              containerStyle={styles.autocompleteContainer}
            />
          </View>

          <View style={styles.mapContainer}>
            <LocationPicker
              value={destination || undefined}
              onLocationSelect={handleLocationSelect}
              placeholder="Select destination..."
              title="Choose Destination"
              showMap={true}
            />
          </View>
        </View>
      </Modal>

      {/* Add the WaitingModal component */}
      <WaitingModal />

      {/* Add the PaymentMethodModal component */}
      <PaymentMethodModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    backgroundColor: '#0d4217',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  searchContainer: {
    flex: 1,
    marginRight: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInputText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#000',
  },
  placeholder: {
    color: '#999',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  currentLocationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0d4217',
    borderWidth: 2,
    borderColor: '#fff',
  },
  destinationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recenterButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chooseButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    margin: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 90,
  },
  chooseButtonDisabled: {
    backgroundColor: '#ccc',
  },
  chooseButtonText: {
    color: '#0d4217',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#bed2d0',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  navItem: {
    alignItems: 'center',
    padding: 10,
  },
  inactiveNavItem: {
    opacity: 0.7,
  },
  inactiveIcon: {
    opacity: 0.7,
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -50 }],
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
  },
  loadingText: {
    marginTop: 10,
    color: '#0d4217',
    fontSize: 14,
    fontWeight: 'bold',
  },
  searchLoading: {
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 8,
    marginHorizontal: 16,
    borderRadius: 4,
    marginTop: 8,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
  },
  mapControls: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  controlButton: {
    padding: 8,
    marginVertical: 4,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  activeControlButton: {
    backgroundColor: '#2196F3',
  },
  navigationInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  turnInstruction: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0d4217',
    marginBottom: 5
  },
  distanceInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3
  },
  timeInfo: {
    fontSize: 14,
    color: '#666'
  },
  routeInfoContainer: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    zIndex: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0d4217',
    marginBottom: 10,
  },
  bookingInfo: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  infoText: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  autocompleteContainer: {
    zIndex: 1000,
  },
  paymentMethodsContainer: {
    marginBottom: 20,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 2,
    borderColor: '#0d4217',
    borderRadius: 5,
  },
  selectedPaymentMethod: {
    backgroundColor: '#2196F3',
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodText: {
    marginLeft: 10,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: '#666',
  },
  selectedPaymentText: {
    color: '#fff',
  },
  paymentSummary: {
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: 'bold',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#0d4217',
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: '#FFD700',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: '#0d4217',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 