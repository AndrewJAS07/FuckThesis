import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MapPin, Navigation, Clock, Car } from 'lucide-react-native';
import { GOOGLE_MAPS_ENDPOINTS, buildGoogleMapsUrl, TRAVEL_MODES } from '../lib/google-maps-config';

interface Route {
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
  polyline: {
    points: string;
  };
  steps: RouteStep[];
}

interface RouteStep {
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
  instruction: string;
  maneuver: string;
}

interface GoogleDirectionsProps {
  origin: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  destination: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  travelMode?: string;
  onRouteReceived?: (route: Route) => void;
  onError?: (error: string) => void;
  showRouteInfo?: boolean;
  onNavigate?: () => void;
}

const GoogleDirections: React.FC<GoogleDirectionsProps> = ({
  origin,
  destination,
  travelMode = TRAVEL_MODES.DRIVING,
  onRouteReceived,
  onError,
  showRouteInfo = true,
  onNavigate,
}) => {
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (origin && destination) {
      fetchDirections();
    }
  }, [origin, destination, travelMode]);

  const fetchDirections = async () => {
    setLoading(true);
    try {
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destinationStr = `${destination.latitude},${destination.longitude}`;

      const params = {
        origin: originStr,
        destination: destinationStr,
        mode: travelMode,
        alternatives: 'false',
        units: 'metric',
      };

      const url = buildGoogleMapsUrl(GOOGLE_MAPS_ENDPOINTS.DIRECTIONS, params);
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        const routeData = data.routes[0];
        const legs = routeData.legs[0];
        
        const routeInfo: Route = {
          distance: legs.distance,
          duration: legs.duration,
          polyline: routeData.overview_polyline,
          steps: legs.steps.map((step: any) => ({
            distance: step.distance,
            duration: step.duration,
            instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
            maneuver: step.maneuver || 'straight',
          })),
        };

        setRoute(routeInfo);
        onRouteReceived?.(routeInfo);
      } else {
        const errorMessage = data.error_message || 'Unable to find route';
        onError?.(errorMessage);
        Alert.alert('Route Error', errorMessage);
      }
    } catch (error) {
      console.error('Error fetching directions:', error);
      const errorMessage = 'Failed to fetch route';
      onError?.(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

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

  const getRouteCoordinates = () => {
    if (route?.polyline?.points) {
      return decodePolyline(route.polyline.points);
    }
    return [];
  };

  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate();
    } else {
      // Open in Google Maps app
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=${travelMode}`;
      // You can use Linking.openURL(url) here if you import Linking from react-native
      Alert.alert('Navigation', 'Opening in Google Maps...');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Calculating route...</Text>
      </View>
    );
  }

  if (!route) {
    return null;
  }

  return (
    <View style={styles.container}>
      {showRouteInfo && (
        <View style={styles.routeInfo}>
          <View style={styles.routeHeader}>
            <View style={styles.routeItem}>
              <Car size={20} color="#007AFF" />
              <Text style={styles.routeText}>{route.distance.text}</Text>
            </View>
            <View style={styles.routeItem}>
              <Clock size={20} color="#007AFF" />
              <Text style={styles.routeText}>{route.duration.text}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.navigateButton} onPress={handleNavigate}>
            <Navigation size={20} color="#fff" />
            <Text style={styles.navigateButtonText}>Navigate</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  routeInfo: {
    gap: 12,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  navigateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GoogleDirections; 