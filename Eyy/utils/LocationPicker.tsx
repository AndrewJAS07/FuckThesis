import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { MapPin, X, Navigation } from 'lucide-react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';
import { getCurrentLocation } from '../lib/google-maps-config';

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

interface LocationPickerProps {
  value?: Location;
  onLocationSelect: (location: Location) => void;
  placeholder?: string;
  title?: string;
  showMap?: boolean;
  style?: any;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onLocationSelect,
  placeholder = 'Select location...',
  title = 'Choose Location',
  showMap = true,
  style,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(value || null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 13.6195, // NAGA City coordinates as default
    longitude: 123.1814,
    latitudeDelta: 0.0122,
    longitudeDelta: 0.0021,
  });
  const [userLocation, setUserLocation] = useState<Location | null>(null);

  useEffect(() => {
    if (value) {
      setSelectedLocation(value);
      setMapRegion({
        latitude: value.latitude,
        longitude: value.longitude,
        latitudeDelta: 0.0122,
        longitudeDelta: 0.0021,
      });
    }
  }, [value]);

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to use this feature.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const userLoc: Location = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: 'Current Location',
      };

      setUserLocation(userLoc);
      
      // Set map region to user location if no location is selected
      if (!selectedLocation) {
        setMapRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0122,
          longitudeDelta: 0.0021,
        });
      }
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  const handlePlaceSelect = async (place: any, details: any) => {
    if (details?.geometry?.location) {
      const location: Location = {
        latitude: details.geometry.location.lat,
        longitude: details.geometry.location.lng,
        address: place.description,
      };

      setSelectedLocation(location);
      setMapRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.0122,
        longitudeDelta: 0.0021,
      });
    }
  };

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    
    try {
      // Reverse geocoding to get address
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=YOUR_GOOGLE_MAPS_API_KEY`
      );
      const data = await response.json();
      
      const address = data.results?.[0]?.formatted_address || 'Selected Location';
      
      const location: Location = {
        latitude,
        longitude,
        address,
      };

      setSelectedLocation(location);
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      const location: Location = {
        latitude,
        longitude,
        address: 'Selected Location',
      };
      setSelectedLocation(location);
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      setModalVisible(false);
    } else {
      Alert.alert('No Location Selected', 'Please select a location first.');
    }
  };

  const handleUseCurrentLocation = () => {
    if (userLocation) {
      setSelectedLocation(userLocation);
      setMapRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.0122,
        longitudeDelta: 0.0021,
      });
    } else {
      Alert.alert('Location Unavailable', 'Unable to get your current location.');
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.inputContainer}
        onPress={() => setModalVisible(true)}
      >
        <MapPin size={20} color="#666" style={styles.icon} />
        <Text style={[styles.inputText, !selectedLocation && styles.placeholder]}>
          {selectedLocation ? selectedLocation.address : placeholder}
        </Text>
        <Navigation size={16} color="#666" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <GooglePlacesAutocomplete
              placeholder="Search for a place..."
              onPlaceSelected={handlePlaceSelect}
              containerStyle={styles.autocompleteContainer}
            />
          </View>

          {showMap && (
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                region={mapRegion}
                onPress={handleMapPress}
                showsUserLocation={true}
                showsMyLocationButton={true}
                showsCompass={true}
                showsScale={true}
                mapType="standard"
              >
                {selectedLocation && (
                  <Marker
                    coordinate={{
                      latitude: selectedLocation.latitude,
                      longitude: selectedLocation.longitude,
                    }}
                    title="Selected Location"
                    description={selectedLocation.address}
                    pinColor="#007AFF"
                  />
                )}
              </MapView>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.currentLocationButton}
              onPress={handleUseCurrentLocation}
            >
              <Navigation size={20} color="#007AFF" />
              <Text style={styles.currentLocationText}>Use Current Location</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmButton, !selectedLocation && styles.disabledButton]}
              onPress={handleConfirm}
              disabled={!selectedLocation}
            >
              <Text style={styles.confirmButtonText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  icon: {
    marginRight: 8,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  placeholder: {
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  autocompleteContainer: {
    zIndex: 1000,
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    gap: 8,
  },
  currentLocationText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LocationPicker; 