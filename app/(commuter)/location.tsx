import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { PathFinder, Point } from '../../utils/pathfinding';
import { rideAPI } from '../../lib/api';
import { MaterialIcons } from '@expo/vector-icons';

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
  const [currentLocation, setCurrentLocation] = useState<Location>(NAGA_CITY_CENTER);
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
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const [isRiderView, setIsRiderView] = useState(false);
  const [mapStyle, setMapStyle] = useState('standard');
  const [showTraffic, setShowTraffic] = useState(false);
  const [navigationMode, setNavigationMode] = useState<'follow' | 'overview'>('follow');
  const [nextTurn, setNextTurn] = useState<TurnInfo | null>(null);
  const [remainingDistance, setRemainingDistance] = useState<number>(0);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [fare, setFare] = useState<number>(0);
  const [totalDistance, setTotalDistance] = useState<number>(0);

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

  // Simple path creation
  const createPath = (start: Location, end: Location): { latitude: number; longitude: number }[] => {
    return [
      { latitude: start.latitude, longitude: start.longitude },
      { latitude: end.latitude, longitude: end.longitude }
    ];
  };

  // Initialize pathfinder with OpenStreetMap data
  useEffect(() => {
    const initializePathFinder = async () => {
      try {
        setIsLoading(true);
        
        // Fetch road network data around current location with a smaller radius
        await pathFinder.fetchRoadNetwork(currentLocation, 2000); // Reduced to 2km radius
        console.log('Initial road network fetched.', { 
          nodes: Object.keys(pathFinder.getNodes()).length, 
          osmNodes: Object.keys(pathFinder.getOsmNodes()).length, 
          osmWays: Object.keys(pathFinder.getOsmWays()).length 
        });
        
        // Find and connect nearest road node to current location
        const nearestNodeId = pathFinder.findNearestOsmNode(currentLocation, 1000); // Reduced search radius
        if (nearestNodeId) {
          pathFinder.addNode('current', currentLocation);
          pathFinder.addEdge('current', nearestNodeId);
          console.log('Connected current location to nearest road node:', nearestNodeId);
        } else {
          console.warn('Could not connect current location to the initial road network.');
          // Try to fetch more road network data with a smaller radius
          await pathFinder.fetchRoadNetwork(currentLocation, 3000);
          const retryNodeId = pathFinder.findNearestOsmNode(currentLocation, 1500);
          if (retryNodeId) {
            pathFinder.addNode('current', currentLocation);
            pathFinder.addEdge('current', retryNodeId);
            console.log('Connected current location to nearest road node on retry:', retryNodeId);
          }
        }
      } catch (error) {
        console.error('Error initializing pathfinder:', error);
        Alert.alert('Error', 'Failed to load initial road network data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    initializePathFinder();
  }, [currentLocation]);

  const handleSearch = async (query: string) => {
    try {
      setIsLoading(true);
      setSearchError(null);

      // Check cache first
      const cachedResult = searchCache[query];
      if (cachedResult?.timestamp && Date.now() - cachedResult.timestamp < CACHE_EXPIRY) {
        console.log('Using cached search result');
        setDestination(cachedResult);
        updateMapRegion(cachedResult);
        
        // Calculate path using road network
        const nearestCurrentOsmNodeId = pathFinder.findNearestOsmNode(currentLocation, 10000);
        const nearestDestinationOsmNodeId = pathFinder.findNearestOsmNode(cachedResult, 10000);

        if (!nearestCurrentOsmNodeId || !nearestDestinationOsmNodeId) {
          throw new Error('Could not find road connections for cached location');
        }

        const pathResult = await calculatePath(nearestCurrentOsmNodeId, nearestDestinationOsmNodeId, cachedResult);
        setPathCoordinates(pathResult);
        return;
      }

      // Perform new search
      const results = await searchLocation(query);
      if (!results || results.length === 0) {
        throw new Error('No results found');
      }

      const newDestination: Location = {
        latitude: results[0].lat,
        longitude: results[0].lon,
        name: results[0].display_name,
        timestamp: Date.now()
      };

      // Cache the result
      setSearchCache(prev => {
        const newCache = { ...prev, [query]: newDestination };
        // Remove oldest entries if cache is too large
        const entries = Object.entries(newCache);
        if (entries.length > MAX_CACHE_SIZE) {
          const sortedEntries = entries.sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));
          return Object.fromEntries(sortedEntries.slice(0, MAX_CACHE_SIZE));
        }
        return newCache;
      });

      setDestination(newDestination);
      updateMapRegion(newDestination);
      
      // Initialize pathfinder if needed
      if (!pathFinder.getNodes()['current']) {
        await pathFinder.fetchRoadNetwork(newDestination, 15000);
      }

      // Find nearest OSM nodes
      const nearestCurrentOsmNodeId = pathFinder.findNearestOsmNode(currentLocation, 10000);
      const nearestDestinationOsmNodeId = pathFinder.findNearestOsmNode(newDestination, 10000);

      if (!nearestCurrentOsmNodeId || !nearestDestinationOsmNodeId) {
        throw new Error('Could not find road connections for the destination');
      }

      const pathResult = await calculatePath(nearestCurrentOsmNodeId, nearestDestinationOsmNodeId, newDestination);
      setPathCoordinates(pathResult);

    } catch (error) {
      console.error('Search error:', error);
      setSearchError(error instanceof Error ? error.message : 'Failed to search location');
      setDestination(null);
      setPathCoordinates([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced path calculation with smoothing
  const calculatePath = async (startNodeId: string, endNodeId: string, destination: Location): Promise<Point[]> => {
    try {
      setIsLoading(true);
      const pathResult = pathFinder.findShortestPath(startNodeId, endNodeId);
      
      if (!pathResult) {
        throw new Error('No path found');
      }

      // Get detailed path coordinates
      const detailedPath = pathFinder.getDetailedPathCoordinates(pathResult.path);
      
      // Calculate fare and update state
      const fare = calculateEstimatedFare(currentLocation, destination);
      setFare(fare);
      setTotalDistance(pathResult.distance);
      setEstimatedTime(pathResult.estimatedTime);

      // Update path coordinates
      setPathCoordinates(detailedPath);

      // Animate map to show the entire path
      if (mapRef.current && detailedPath.length > 0) {
        const coordinates = detailedPath.map(point => ({
          latitude: point.latitude,
          longitude: point.longitude
        }));

        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true
        });
      }

      return detailedPath;
    } catch (error) {
      console.error('Error calculating path:', error);
      setSearchError('Failed to calculate route. Please try again.');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced path smoothing
  const smoothPath = (points: Point[]): Point[] => {
    if (points.length <= 2) return points;

    const smoothed: Point[] = [points[0]];
    let currentIndex = 0;

    while (currentIndex < points.length - 1) {
      let furthestVisible = currentIndex + 1;
      
      // Look ahead to find the furthest visible point
      for (let i = currentIndex + 2; i < points.length; i++) {
        if (isLineOfSight(points[currentIndex], points[i])) {
          furthestVisible = i;
        }
      }

      smoothed.push(points[furthestVisible]);
      currentIndex = furthestVisible;
    }

    return smoothed;
  };

  // Check if there's a direct line of sight between two points
  const isLineOfSight = (point1: Point, point2: Point): boolean => {
    const distance = calculateDistance(point1, point2);
    return distance < 100; // 100 meters threshold
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

  const debouncedSearch = (text: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    setSearchText(text);
    const timeout = setTimeout(() => {
      handleSearch(text);
    }, 300); // Reduced debounce time to 300ms for better responsiveness
    setSearchTimeout(timeout);
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

  const handleChooseDestination = async () => {
    if (!destination || isLoading || isBooking) return;

    try {
      setIsBooking(true);
      
      // Validate current location and destination
      if (!currentLocation || !destination) {
        throw new Error('Invalid location data');
      }

      // Validate coordinates
      if (isNaN(currentLocation.latitude) || isNaN(currentLocation.longitude) ||
          isNaN(destination.latitude) || isNaN(destination.longitude)) {
        throw new Error('Invalid coordinates');
      }

      // Calculate distance and fare
      const distance = calculateDistance(currentLocation, destination);
      if (distance <= 0) {
        throw new Error('Invalid distance calculation');
      }

      const estimatedFare = calculateEstimatedFare(currentLocation, destination);
      if (estimatedFare <= 0) {
        throw new Error('Invalid fare calculation');
      }

      // Create ride data with all necessary fields
      const rideData = {
        pickupLocation: {
          type: 'Point',
          coordinates: [currentLocation.longitude, currentLocation.latitude] as [number, number],
          address: currentLocation.address || "Current Location"
        },
        dropoffLocation: {
          type: 'Point',
          coordinates: [destination.longitude, destination.latitude] as [number, number],
          address: destination.address || searchText || "Selected Destination"
        },
        fare: estimatedFare,
        distance: distance,
        duration: Math.ceil(distance / 1000 * 3), // Rough estimate: 3 minutes per km
        paymentMethod: 'cash', // Default to cash payment
        status: 'pending'
      };

      console.log('Creating ride with data:', {
        pickup: rideData.pickupLocation,
        dropoff: rideData.dropoffLocation,
        fare: rideData.fare,
        distance: rideData.distance
      });

      // Create ride with retry logic
      let retryCount = 0;
      const maxRetries = 2;
      let rideResponse = null;

      while (retryCount < maxRetries && !rideResponse) {
        try {
          rideResponse = await rideAPI.createRide(rideData);
          if (!rideResponse || !rideResponse.id) {
            throw new Error('Invalid ride response');
          }
          console.log('Ride created successfully:', rideResponse.id);
        } catch (error) {
          console.error(`Ride creation attempt ${retryCount + 1} failed:`, error);
          retryCount++;
          if (retryCount === maxRetries) {
            throw new Error('Failed to create ride after multiple attempts');
          }
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      if (!rideResponse || !rideResponse.id) {
        throw new Error('Failed to create ride. Please try again.');
      }

      // Navigate to booking screen with the ride data
      router.push({
        pathname: "/(commuter)/booking",
        params: {
          rideId: rideResponse.id,
          pickupLat: currentLocation.longitude.toString(),
          pickupLng: currentLocation.latitude.toString(),
          destLat: destination.latitude.toString(),
          destLng: destination.longitude.toString(),
          destAddress: destination.address || searchText,
          distance: distance.toString(),
          fare: estimatedFare.toString(),
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error creating booking:', error);
      Alert.alert(
        'Booking Error',
        error instanceof Error ? error.message : 'Failed to create booking. Please try again.'
      );
    } finally {
      setIsBooking(false);
    }
  };

  const calculateEstimatedFare = (start: Location, end: Location): number => {
    const distance = calculateDistance(start, end);
    const baseFare = 50; // Base fare in pesos
    const perKmRate = 15; // Rate per kilometer
    const minimumFare = 70; // Minimum fare in pesos
    
    const fare = baseFare + (distance / 1000 * perKmRate); // Convert meters to kilometers
    return Math.max(fare, minimumFare);
  };

  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
        return;
      }

      // Get initial location with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: LOCATION_SETTINGS.HIGH_ACCURACY.accuracy,
      });

      const newLocation: Location = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      };

      if (isWithinNagaCity(newLocation)) {
        setCurrentLocation(newLocation);
        setLocationAccuracy(location.coords.accuracy);
        
        // Zoom to user location with closer zoom
        const newRegion = {
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          latitudeDelta: 0.001, // Closer zoom
          longitudeDelta: 0.001,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 300);
      }

      // Start watching location with high accuracy
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: LOCATION_SETTINGS.HIGH_ACCURACY.accuracy,
          timeInterval: LOCATION_SETTINGS.HIGH_ACCURACY.timeInterval,
          distanceInterval: LOCATION_SETTINGS.HIGH_ACCURACY.distanceInterval,
        },
        (location) => {
          const newLocation: Location = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
          };

          if (isWithinNagaCity(newLocation) && 
              location.coords.accuracy !== null && 
              location.coords.accuracy <= LOCATION_SETTINGS.MAX_ACCURACY_THRESHOLD) {
            setCurrentLocation(newLocation);
            setLocationAccuracy(location.coords.accuracy);
            setLastLocationUpdate(Date.now());
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

  // Cleanup location subscription
  useEffect(() => {
    getCurrentLocation();
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

  // Function to search for locations using Nominatim API
  const searchLocation = async (query: string): Promise<SearchResult[]> => {
    try {
      if (!query.trim()) {
        return [];
      }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&countrycodes=ph&limit=5`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'EyyRideSharing/1.0', // Required by Nominatim usage policy
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format from Nominatim API');
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format from Nominatim API');
      }

      return data.map((item: any) => ({
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        display_name: item.display_name
      }));
    } catch (error) {
      console.error('Error searching location:', error);
      setSearchError('Failed to search location. Please try again.');
      throw error;
    }
  };

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

  // Function to update rider's heading
  const updateRiderHeading = (heading: number) => {
    setCurrentLocation(prev => ({
      ...prev,
      heading
    }));
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <Ionicons name="location-outline" size={20} color="#0d4217" />
          <TextInput
            style={styles.searchInput}
            placeholder="Where do you want to go?"
            placeholderTextColor="#666"
            value={searchText}
            onChangeText={debouncedSearch}
            returnKeyType="search"
          />
          {isLoading && (
            <ActivityIndicator size="small" color="#0d4217" style={styles.searchLoading} />
          )}
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
          provider={PROVIDER_DEFAULT}
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
              longitude: currentLocation.longitude
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={currentLocation.heading || 0}
          >
            <View style={styles.currentLocationMarker}>
              <Ionicons name="location" size={24} color="#0d4217" />
            </View>
          </Marker>

          {/* Destination Marker */}
          {destination && (
            <Marker
              coordinate={{
                latitude: destination.latitude,
                longitude: destination.longitude
              }}
              anchor={{ x: 0.5, y: 1.0 }}
            >
              <View style={styles.destinationMarker}>
                <Ionicons name="flag" size={24} color="#e74c3c" />
              </View>
            </Marker>
          )}

          {/* Path Polyline */}
          {pathCoordinates.length > 0 && (
            <Polyline
              coordinates={pathCoordinates}
              strokeWidth={4}
              strokeColor="#0d4217"
              lineDashPattern={[1]}
              zIndex={1}
              tappable={false}
              geodesic={true}
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

      {/* Choose Button */}
      <TouchableOpacity 
        style={[
          styles.chooseButton, 
          (!destination || isLoading || isBooking) && styles.chooseButtonDisabled
        ]}
        onPress={handleChooseDestination}
        disabled={!destination || isLoading || isBooking}
      >
        <Text style={styles.chooseButtonText}>
          {isBooking ? 'PROCESSING...' : 
           isLoading ? 'LOADING...' : 
           destination ? 'CHOOSE THIS DESTINATION' : 
           'SELECT A DESTINATION'}
        </Text>
      </TouchableOpacity>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Link href="/(commuter)/dashboardcommuter" style={[styles.navItem, styles.inactiveNavItem]}>
          <Ionicons name="home" size={24} color="#004D00" style={styles.inactiveIcon} />
        </Link>
        <Link href="/historycommuter" style={[styles.navItem, styles.inactiveNavItem]}>
          <Ionicons name="time" size={24} color="#004D00" style={styles.inactiveIcon} />
        </Link>
        <Link href="/profilecommuter" style={[styles.navItem, styles.inactiveNavItem]}>
          <Ionicons name="person" size={24} color="#004D00" style={styles.inactiveIcon} />
        </Link>
      </View>

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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#000',
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
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#0d4217'
  },
  destinationMarker: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#e74c3c'
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
}); 