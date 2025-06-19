import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MapPin, Navigation, Car, Clock } from 'lucide-react-native';
import LocationPicker from './LocationPicker';
import { RouteMap } from './RouteMap';
import GoogleDirections from './GoogleDirections';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';
import { TRAVEL_MODES } from '../lib/google-maps-config';

interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

const GoogleMapsExample: React.FC = () => {
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [travelMode, setTravelMode] = useState(TRAVEL_MODES.DRIVING);
  const [routeInfo, setRouteInfo] = useState<any>(null);

  const handleOriginSelect = (location: Location) => {
    setOrigin(location);
  };

  const handleDestinationSelect = (location: Location) => {
    setDestination(location);
  };

  const handlePlaceSelect = (place: any, details: any) => {
    if (details?.geometry?.location) {
      const location: Location = {
        latitude: details.geometry.location.lat,
        longitude: details.geometry.location.lng,
        address: place.description,
      };
      
      if (!origin) {
        setOrigin(location);
      } else if (!destination) {
        setDestination(location);
      }
    }
  };

  const handleRouteReceived = (route: any) => {
    setRouteInfo(route);
  };

  const handleNavigate = () => {
    Alert.alert('Navigation', 'Opening navigation in Google Maps...');
    // Here you would implement actual navigation
  };

  const clearRoute = () => {
    setOrigin(null);
    setDestination(null);
    setRouteInfo(null);
  };

  const swapLocations = () => {
    if (origin && destination) {
      const temp = origin;
      setOrigin(destination);
      setDestination(temp);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Google Maps Integration</Text>
        <Text style={styles.subtitle}>Autocomplete, Routes & Navigation</Text>
      </View>

      {/* Location Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Locations</Text>
        
        <View style={styles.locationContainer}>
          <Text style={styles.locationLabel}>Origin</Text>
          <LocationPicker
            value={origin || undefined}
            onLocationSelect={handleOriginSelect}
            placeholder="Select pickup location..."
            title="Choose Pickup Location"
          />
        </View>

        <View style={styles.locationContainer}>
          <Text style={styles.locationLabel}>Destination</Text>
          <LocationPicker
            value={destination || undefined}
            onLocationSelect={handleDestinationSelect}
            placeholder="Select destination..."
            title="Choose Destination"
          />
        </View>

        {/* Quick Search */}
        <View style={styles.quickSearchContainer}>
          <Text style={styles.quickSearchLabel}>Quick Search</Text>
          <GooglePlacesAutocomplete
            placeholder="Search for places..."
            onPlaceSelected={handlePlaceSelect}
            containerStyle={styles.autocompleteContainer}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.swapButton]}
            onPress={swapLocations}
            disabled={!origin || !destination}
          >
            <Navigation size={16} color="#007AFF" />
            <Text style={styles.swapButtonText}>Swap</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.clearButton]}
            onPress={clearRoute}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Travel Mode Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Travel Mode</Text>
        <View style={styles.travelModeContainer}>
          {Object.entries(TRAVEL_MODES).map(([key, mode]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.travelModeButton,
                travelMode === mode && styles.travelModeButtonActive
              ]}
              onPress={() => setTravelMode(mode)}
            >
              <Text style={[
                styles.travelModeText,
                travelMode === mode && styles.travelModeTextActive
              ]}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Route Map */}
      {origin && destination && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route</Text>
          <View style={styles.mapContainer}>
            <RouteMap
              origin={origin}
              destination={destination}
              travelMode={travelMode}
              onRouteReceived={handleRouteReceived}
            />
          </View>
        </View>
      )}

      {/* Route Information */}
      {origin && destination && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route Information</Text>
          <GoogleDirections
            origin={origin}
            destination={destination}
            travelMode={travelMode}
            onRouteReceived={handleRouteReceived}
            onNavigate={handleNavigate}
          />
        </View>
      )}

      {/* Route Details */}
      {routeInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route Details</Text>
          <View style={styles.routeDetailsContainer}>
            <View style={styles.routeDetailItem}>
              <Car size={20} color="#007AFF" />
              <Text style={styles.routeDetailText}>
                Distance: {routeInfo.distance?.text || 'N/A'}
              </Text>
            </View>
            <View style={styles.routeDetailItem}>
              <Clock size={20} color="#007AFF" />
              <Text style={styles.routeDetailText}>
                Duration: {routeInfo.duration?.text || 'N/A'}
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  locationContainer: {
    marginBottom: 16,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  quickSearchContainer: {
    marginBottom: 16,
  },
  quickSearchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  autocompleteContainer: {
    zIndex: 1000,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  swapButton: {
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  swapButtonText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  clearButton: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  clearButtonText: {
    color: '#ef4444',
    fontWeight: '500',
  },
  travelModeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  travelModeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  travelModeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  travelModeText: {
    color: '#666',
    fontWeight: '500',
  },
  travelModeTextActive: {
    color: '#fff',
  },
  mapContainer: {
    height: 300,
    borderRadius: 8,
    overflow: 'hidden',
  },
  routeDetailsContainer: {
    gap: 12,
  },
  routeDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  routeDetailText: {
    fontSize: 16,
    color: '#333',
  },
});

export default GoogleMapsExample; 