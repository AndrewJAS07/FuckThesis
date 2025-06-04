import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { PathFinder, Point } from '../utils/pathfinding';
import { rideAPI } from '../lib/api';

interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp?: number;
  address?: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const [pathCoordinates, setPathCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<number>(0);
  const LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds
  const [isBooking, setIsBooking] = useState(false);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

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
    if (!query.trim()) {
      setSearchError(null);
      return;
    }

    try {
      setSearchError(null);
      setIsLoading(true);

      // Check cache first
      const cachedLocation = searchCache[query];
      if (cachedLocation && typeof cachedLocation.timestamp === 'number') {
        if (Date.now() - cachedLocation.timestamp < CACHE_EXPIRY) {
          setDestination(cachedLocation);
          updateMapRegion(cachedLocation);
          setIsLoading(false);
          return;
        }
      }

      let searchData = null;
      let searchSuccess = false;
      let searchRetryCount = 0;
      const maxSearchRetries = 3;

      while (!searchSuccess && searchRetryCount < maxSearchRetries) {
        try {
          // Create a timeout promise
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 5000);
          });

          // First attempt with strict bounds
          const searchPromise = fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=ph&bounded=1&viewbox=${NAGA_CITY_BOUNDS.west},${NAGA_CITY_BOUNDS.north},${NAGA_CITY_BOUNDS.east},${NAGA_CITY_BOUNDS.south}&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en',
                'User-Agent': 'eyytrike-app'
              }
            }
          );

          // Race between the search and timeout
          const response = await Promise.race([searchPromise, timeoutPromise]) as Response;

          if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
          }

          searchData = await response.json();
          
          // If no results, try a broader search without the viewbox constraint
          if (!searchData || searchData.length === 0) {
            const broaderPromise = fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=ph&addressdetails=1`,
              {
                headers: {
                  'Accept-Language': 'en',
                  'User-Agent': 'eyytrike-app'
                }
              }
            );

            // Race between the broader search and timeout
            const broaderResponse = await Promise.race([broaderPromise, timeoutPromise]) as Response;
            
            if (broaderResponse.ok) {
              searchData = await broaderResponse.json();
            }
          }
          
          searchSuccess = true;
        } catch (error) {
          console.warn(`Search request failed (attempt ${searchRetryCount + 1}/${maxSearchRetries}):`, error);
          searchRetryCount++;
          
          if (searchRetryCount === maxSearchRetries) {
            // If all retries fail, try a fallback search with a different API
            try {
              const fallbackTimeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), 5000);
              });

              const fallbackPromise = fetch(
                `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query + ', Naga City, Philippines')}&key=YOUR_OPENCAGE_API_KEY&limit=1`
              );

              // Race between the fallback search and timeout
              const fallbackResponse = await Promise.race([fallbackPromise, fallbackTimeoutPromise]) as Response;
              
              if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                if (fallbackData.results && fallbackData.results.length > 0) {
                  searchData = [{
                    lat: fallbackData.results[0].geometry.lat.toString(),
                    lon: fallbackData.results[0].geometry.lng.toString(),
                    display_name: fallbackData.results[0].formatted
                  }];
                  searchSuccess = true;
                }
              }
            } catch (fallbackError) {
              console.error('Fallback search failed:', fallbackError);
              throw new Error('Failed to search location after multiple attempts. Please try again.');
            }
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * searchRetryCount));
        }
      }

      if (!searchData || searchData.length === 0) {
        throw new Error('No locations found. Please try a different search term.');
      }

      // Find the best matching result
      let bestMatch = null;
      let bestScore = -1;

      for (const result of searchData) {
        if (!result || typeof result.lat !== 'string' || typeof result.lon !== 'string') {
          continue;
        }

        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        if (isNaN(lat) || isNaN(lon)) {
          continue;
        }

        const location = { latitude: lat, longitude: lon };
        
        // Calculate score based on:
        // 1. Whether it's within Naga City bounds
        // 2. How well the display name matches the search query
        // 3. The presence of important address components
        let score = 0;
        
        if (isWithinNagaCity(location)) {
          score += 3;
        }
        
        const displayName = result.display_name?.toLowerCase() || '';
        const searchTerms = query.toLowerCase().split(' ');
        const matchingTerms = searchTerms.filter(term => displayName.includes(term));
        score += matchingTerms.length;
        
        if (result.address) {
          if (result.address.city === 'Naga') score += 2;
          if (result.address.state === 'Bicol') score += 1;
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = result;
        }
      }

      if (!bestMatch) {
        throw new Error('No suitable locations found. Please try a different search term.');
      }

      const newDestination = {
        latitude: parseFloat(bestMatch.lat),
        longitude: parseFloat(bestMatch.lon),
        timestamp: Date.now(),
        address: bestMatch.display_name || query
      };

      // Cache the result
      setSearchCache(prev => {
        const newCache = { ...prev, [query]: newDestination };
        // Remove oldest entries if cache is too large
        const entries = Object.entries(newCache);
        if (entries.length > MAX_CACHE_SIZE) {
          const sortedEntries = entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
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
        console.warn('Could not find nearest OSM nodes, using direct path');
        const directPath = createPath(currentLocation, newDestination);
        setPathCoordinates(directPath);
      } else {
        const pathResult = await calculatePath(nearestCurrentOsmNodeId, nearestDestinationOsmNodeId, newDestination);
        setPathCoordinates(pathResult);
      }

    } catch (error) {
      console.error('Search error:', error);
      setSearchError(error instanceof Error ? error.message : 'Failed to search location');
      setDestination(null);
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePath = async (startNodeId: string, endNodeId: string, destination: Location) => {
    try {
      // Calculate direct path first for immediate response
      const directPath = createPath(currentLocation, destination);
      setPathCoordinates(directPath);

      // Then try to find a better path using OSM data
      const centerLat = (currentLocation.latitude + destination.latitude) / 2;
      const centerLon = (currentLocation.longitude + destination.longitude) / 2;
      const centerPoint = { latitude: centerLat, longitude: centerLon };
      
      // Calculate appropriate radius based on distance
      const distance = calculateDistance(currentLocation, destination);
      const radius = Math.min(distance * 0.5, 2000); // Reduced to 2km max for better performance

      console.log('Fetching road network with radius:', radius, 'meters');

      // Fetch road network with retry logic
      let retryCount = 0;
      const maxRetries = 2;
      let success = false;

      while (!success && retryCount < maxRetries) {
        try {
          // Create a new PathFinder instance for each attempt to avoid memory issues
          const newPathFinder = new PathFinder();
          
          await newPathFinder.fetchRoadNetwork(centerPoint, radius);
          success = true;
          console.log('Road network fetched successfully');
          
          // Find nearest OSM nodes with smaller search radius
          const nearestCurrentOsmNodeId = newPathFinder.findNearestOsmNode(currentLocation, 1000);
          const nearestDestinationOsmNodeId = newPathFinder.findNearestOsmNode(destination, 1000);

          if (!nearestCurrentOsmNodeId || !nearestDestinationOsmNodeId) {
            console.warn('Could not find nearest OSM nodes, using direct path');
            return directPath;
          }

          // Add current and destination nodes
          newPathFinder.addNode('current', currentLocation);
          newPathFinder.addNode('destination', destination);
          
          // Add edges with validation
          if (newPathFinder.getNodes()[nearestCurrentOsmNodeId]) {
            newPathFinder.addEdge('current', nearestCurrentOsmNodeId);
          }
          if (newPathFinder.getNodes()[nearestDestinationOsmNodeId]) {
            newPathFinder.addEdge('destination', nearestDestinationOsmNodeId);
          }

          const pathResult = newPathFinder.findShortestPath(nearestCurrentOsmNodeId, nearestDestinationOsmNodeId);
          
          if (pathResult && pathResult.path.length > 1) {
            const fullPathNodeIds = ['current', ...pathResult.path, 'destination'];
            const pathPoints = fullPathNodeIds.map(nodeId => {
              if (nodeId === 'current') return currentLocation;
              if (nodeId === 'destination') return destination;
              const point = newPathFinder.getPathCoordinates([nodeId])[0];
              if (!point) {
                console.warn(`Missing coordinates for node ${nodeId}`);
                return null;
              }
              return point;
            }).filter(point => point !== null) as Point[];

            // Validate path points
            if (pathPoints.length < 2) {
              return directPath;
            }

            // Validate path continuity
            for (let i = 0; i < pathPoints.length - 1; i++) {
              const distance = calculateDistance(pathPoints[i], pathPoints[i + 1]);
              if (distance > 500) { // Reduced threshold to 500m
                return directPath;
              }
            }

            return pathPoints;
          }
        } catch (error) {
          console.warn(`Failed to fetch road network (attempt ${retryCount + 1}/${maxRetries}):`, error);
          retryCount++;
          if (retryCount === maxRetries) {
            // If we can't get the road network, stick with the direct path
            return directPath;
          }
          // Shorter wait time between retries
          await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
        }
      }
      
      return directPath;
    } catch (error) {
      console.error('Error calculating path:', error);
      return createPath(currentLocation, destination);
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
          pickupLat: currentLocation.latitude.toString(),
          pickupLng: currentLocation.longitude.toString(),
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
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          onRegionChangeComplete={(newRegion) => {
            const center = {
              latitude: newRegion.latitude,
              longitude: newRegion.longitude,
            };
            if (!isWithinNagaCity(center)) {
              mapRef.current?.animateToRegion(region, 300);
            } else {
              setRegion(newRegion);
            }
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          showsScale={true}
          minZoomLevel={ZOOM_LEVELS.CITY_OVERVIEW}
          maxZoomLevel={18}
          followsUserLocation={true}
          moveOnMarkerPress={false}
        >
          {/* Current Location Marker */}
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            description={locationAccuracy ? 
              `Accuracy: ${Math.round(locationAccuracy)}m` : 
              undefined
            }
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.currentLocationMarker}>
              <Ionicons 
                name="location" 
                size={30} 
                color="#0d4217"
              />
            </View>
          </Marker>

          {/* Destination Marker */}
          {destination && (
            <Marker
              coordinate={destination}
              title="Destination"
            >
              <View style={styles.destinationMarker}>
                <Ionicons name="flag" size={30} color="#FF0000" />
              </View>
            </Marker>
          )}

          {/* Path Line */}
          {pathCoordinates.length > 0 && (
            <Polyline
              coordinates={pathCoordinates}
              strokeColor="#0d4217"
              strokeWidth={4}
              lineDashPattern={[1]}
              zIndex={1}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </MapView>

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0d4217" />
            <Text style={styles.loadingText}>Finding location...</Text>
          </View>
        )}

        {/* Recenter Button */}
        <TouchableOpacity 
          style={styles.recenterButton}
          onPress={() => {
            if (currentLocation) {
              const newRegion = {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.002,
                longitudeDelta: 0.002,
              };
              setRegion(newRegion);
              mapRef.current?.animateToRegion(newRegion, 300);
            }
          }}
        >
          <Ionicons 
            name="locate" 
            size={24} 
            color="#0d4217"
          />
        </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 4,
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
}); 