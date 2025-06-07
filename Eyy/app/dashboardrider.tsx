import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, Image, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

interface Location {
  latitude: number;
  longitude: number;
}

export default function DashboardRider() {
  const [isAvailable, setIsAvailable] = useState(false);
  const mapRef = useRef<MapView>(null);
  const [currentLocation, setCurrentLocation] = useState<Location>({
    latitude: 13.6195,
    longitude: 123.1814,
  });
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [region, setRegion] = useState({
    latitude: 13.6195,
    longitude: 123.1814,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(newLocation);
      setLocationAccuracy(location.coords.accuracy);
      
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setRegion(newRegion);
      
      mapRef.current?.animateToRegion(newRegion, 1000);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your current location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAvailability = () => {
    setIsAvailable(!isAvailable);
    // Here you would typically update the driver's availability status in the backend
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logo}>
          <Image 
            source={require('../assets/images/eyytrike1.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Ionicons name="notifications-outline" size={24} color="#FFD700" />
        </View>
        <TouchableOpacity 
          style={[styles.statusBar, isAvailable ? styles.statusBarOn : styles.statusBarOff]} 
          onPress={toggleAvailability}
        >
          <Text style={styles.statusText}>
            {isAvailable ? 'Available for ride now!' : 'You are not available for ride now!'}
          </Text>
          <View style={[styles.toggleButton, isAvailable ? styles.toggleOn : styles.toggleOff]}>
            <Text style={styles.toggleText}>{isAvailable ? 'On' : 'Off'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
        >
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            description={locationAccuracy ? `Accuracy: ${Math.round(locationAccuracy)}m` : undefined}
          >
            <View style={styles.currentLocationMarker}>
              <Ionicons name="location" size={30} color="#0d4217" />
            </View>
          </Marker>
        </MapView>

        {/* Recenter Button */}
        <TouchableOpacity 
          style={styles.recenterButton}
          onPress={getCurrentLocation}
        >
          <Ionicons name="locate" size={24} color="#0d4217" />
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Link href="/dashboardrider" style={styles.navItem}>
          <Ionicons name="home" size={24} color="#004D00" />
        </Link>
        <Link href="/historyrider" style={[styles.navItem, styles.inactiveNavItem]}>
          <Ionicons name="time" size={24} color="#004D00" style={styles.inactiveIcon} />
        </Link>
        <Link href="/profilerider" style={[styles.navItem, styles.inactiveNavItem]}>
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
  },
  logo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    paddingLeft: 10,
    marginBottom: 8,
  },
  logoImage: {
    width: 120,
    height: 32,
    marginLeft: -20,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#083010',
  },
  statusBarOn: {
    backgroundColor: '#004D00',
  },
  statusBarOff: {
    backgroundColor: '#083010',
  },
  statusText: {
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 45,
    alignItems: 'center',
  },
  toggleOn: {
    backgroundColor: '#FFD700',
  },
  toggleOff: {
    backgroundColor: '#666',
  },
  toggleText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  content: {
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
    opacity: 0.5,
  },
  inactiveIcon: {
    opacity: 0.5,
  },
});
