import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import * as Location from 'expo-location';
import { MapPin, Navigation } from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import { RouteMap } from '@/components/RouteMap';

export default function BookRideScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [destination, setDestination] = useState('');
  const [destinationCoords, setDestinationCoords] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    })();
  }, []);

  const handleSearch = async () => {
    try {
      const results = await Location.geocodeAsync(destination);
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        setDestinationCoords({
          latitude,
          longitude,
          address: destination
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  if (!location) {
    return (
      <View style={styles.container}>
        <Text>Loading location...</Text>
      </View>
    );
  }

  const origin = {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    address: 'Current Location'
  };

  return (
    <View style={styles.container}>
      {destinationCoords ? (
        <RouteMap origin={origin} destination={destinationCoords} />
      ) : (
        Platform.OS === 'web' ? (
          <View style={[styles.map, styles.webMapPlaceholder]}>
            <Text style={styles.webMapText}>Enter your destination to see the route</Text>
            <MapPin color="#000" size={24} />
          </View>
        ) : (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}>
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}>
              <MapPin color="#000" size={24} />
            </Marker>
          </MapView>
        )
      )}
      
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <TextInput
            style={styles.input}
            placeholder="Where to?"
            value={destination}
            onChangeText={setDestination}
            onSubmitEditing={handleSearch}
          />
        </View>
        
        <TouchableOpacity 
          style={styles.bookButton}
          onPress={handleSearch}>
          <Text style={styles.bookButtonText}>Find Route</Text>
          <Navigation size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  webMapPlaceholder: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webMapText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  searchContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  searchBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    marginBottom: 15,
  },
  input: {
    padding: 15,
    fontSize: 16,
  },
  bookButton: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 