import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import { MapPin } from 'lucide-react-native';
import MapView, { Marker, Polyline, MapEvent, Region } from 'react-native-maps';
import { PathFinder, Point } from './pathfinding';

interface RouteMapProps {}

const NAGA_CITY_BOUNDS = {
  north: 13.6500,
  south: 13.5800,
  east: 123.2000,
  west: 123.1500,
};

function RouteMap({}: RouteMapProps) {
  const mapRef = useRef<MapView>(null);
  const [currentLocation, setCurrentLocation] = useState<Point | null>(null);
  const [destination, setDestination] = useState<Point | null>(null);
  const [route, setRoute] = useState<Point[] | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 13.6195, // Default to Naga City center
    longitude: 123.1814,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [isCreatingRide, setIsCreatingRide] = useState(false); // Add a flag to track ride creation
  const pathFinder = useRef(new PathFinder()).current;

  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  useEffect(() => {
    if (currentLocation && destination) {
      calculateRoute();
    }
  }, [currentLocation, destination]);

  const isWithinNagaCity = (point: Point): boolean => {
    return (
      point.latitude >= NAGA_CITY_BOUNDS.south &&
      point.latitude <= NAGA_CITY_BOUNDS.north &&
      point.longitude >= NAGA_CITY_BOUNDS.west &&
      point.longitude <= NAGA_CITY_BOUNDS.east
    );
  };

  const fetchCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      if (!isWithinNagaCity(coords)) {
        Alert.alert('Error', 'Your current location is outside Naga City.');
        return;
      }

      setCurrentLocation(coords);
      setMapRegion({
        ...coords,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      console.error('Error fetching current location:', error);
      Alert.alert('Error', 'Failed to get current location.');
    }
  };

  const calculateRoute = async () => {
    try {
      if (!currentLocation || !destination) return;

      if (!isWithinNagaCity(destination)) {
        Alert.alert('Error', 'The selected destination is outside Naga City.');
        return;
      }

      // Fetch road network with a limited radius around Naga City
      await pathFinder.fetchRoadNetwork({ latitude: 13.6195, longitude: 123.1814 }, 5000);

      // Find nearest nodes
      const startNodeId = pathFinder.findNearestOsmNode(currentLocation);
      const endNodeId = pathFinder.findNearestOsmNode(destination);

      if (!startNodeId || !endNodeId) {
        Alert.alert('Error', 'Unable to find nearby route nodes.');
        return;
      }

      // Find shortest path
      const result = pathFinder.findShortestPath(startNodeId, endNodeId);

      if (result?.path?.length > 0) {
        const nodes = pathFinder.getNodes();
        const points: Point[] = result.path
          .map((nodeId: string) => nodes[nodeId]?.point)
          .filter((pt): pt is Point => pt != null); // Filter out any undefined points

        setRoute(points);
      } else {
        Alert.alert('Error', 'No route found.');
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      Alert.alert('Error', 'An error occurred while calculating the route.');
    }
  };

  const handleMapPress = (event: MapEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const selectedPoint = { latitude, longitude };

    if (!isWithinNagaCity(selectedPoint)) {
      Alert.alert('Error', 'The selected point is outside Naga City.');
      return;
    }

    setDestination(selectedPoint);
  };

  const createRide = async () => {
    if (isCreatingRide) {
      console.warn('Ride creation is already in progress. Please wait.');
      return; // Prevent multiple attempts
    }

    if (!currentLocation || !destination) {
      Alert.alert('Error', 'Please select a valid destination before creating a ride.');
      return;
    }

    setIsCreatingRide(true); // Set the flag to true to prevent multiple attempts

    try {
      // Example ride creation payload
      const ridePayload = {
        pickupLocation: currentLocation,
        destination,
      };

      // Replace this with your actual API call to create a ride
      const response = await fetch('https://your-api-url.com/rides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ridePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create ride. Please try again later.');
      }

      const rideData = await response.json();
      console.log('Ride created successfully:', rideData);

      Alert.alert('Success', 'Ride created successfully!');
    } catch (error) {
      console.error('Error creating ride:', error);
      Alert.alert('Error', error.message || 'An error occurred while creating the ride.');
    } finally {
      setIsCreatingRide(false); // Reset the flag after the process is complete
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        onPress={handleMapPress}
        initialRegion={mapRegion}
      >
        {currentLocation && (
          <Marker coordinate={currentLocation}>
            <MapPin color="#10b981" size={24} />
          </Marker>
        )}

        {destination && (
          <Marker coordinate={destination}>
            <MapPin color="#ef4444" size={24} />
          </Marker>
        )}

        {route && (
          <Polyline
            coordinates={route}
            strokeColor="#000"
            strokeWidth={3}
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});

export { RouteMap };
