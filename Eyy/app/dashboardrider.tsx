import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { rideAPI } from '../lib/api';

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

interface RideRequest {
  id: string;
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
  status: string;
  createdAt: string;
  commuter?: {
    id: string;
    fullName: string;
    phoneNumber: string;
  };
}

export default function DashboardRider() {
  const router = useRouter();
  const [isAvailable, setIsAvailable] = useState(false);
  const mapRef = useRef<MapView>(null);
  const [currentLocation, setCurrentLocation] = useState<Location>({
    latitude: 13.6195,
    longitude: 123.1814,
  });
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [selectedRide, setSelectedRide] = useState<RideRequest | null>(null);
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

  const fetchRideRequests = async () => {
    try {
      const response = await rideAPI.getRides();
      // Filter for pending ride requests
      const pendingRides = response.filter((ride: RideRequest) => 
        ride.status === 'pending' || ride.status === 'waiting'
      );
      setRideRequests(pendingRides);
      console.log('Fetched ride requests:', pendingRides.length);
    } catch (error) {
      console.error('Error fetching ride requests:', error);
    }
  };

  const acceptRide = async (rideId: string) => {
    try {
      await rideAPI.updateRideStatus(rideId, 'accepted');
      Alert.alert('Success', 'Ride accepted! Navigate to pickup location.');
      
      // Remove the accepted ride from the list
      setRideRequests(prev => prev.filter(ride => ride.id !== rideId));
      
      // Navigate to ride details or navigation
      router.push({
        pathname: '/menurider',
        params: { rideId }
      });
    } catch (error) {
      console.error('Error accepting ride:', error);
      Alert.alert('Error', 'Failed to accept ride. Please try again.');
    }
  };

  const toggleAvailability = () => {
    setIsAvailable(!isAvailable);
    if (!isAvailable) {
      // When becoming available, fetch ride requests
      fetchRideRequests();
    } else {
      // When becoming unavailable, clear ride requests
      setRideRequests([]);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2 - lat1) * Math.PI/180;
    const Δλ = (lon2 - lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Fetch ride requests periodically when available
  useEffect(() => {
    if (isAvailable) {
      fetchRideRequests();
      const interval = setInterval(fetchRideRequests, 10000); // Fetch every 10 seconds
      return () => clearInterval(interval);
    }
  }, [isAvailable]);

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
          {/* Current Location Marker */}
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            description={locationAccuracy ? `Accuracy: ${Math.round(locationAccuracy)}m` : undefined}
          >
            <View style={styles.currentLocationMarker}>
              <Ionicons name="location" size={30} color="#0d4217" />
            </View>
          </Marker>

          {/* Ride Request Markers */}
          {rideRequests.map((ride) => (
            <Marker
              key={ride.id}
              coordinate={{
                latitude: ride.pickupLocation.coordinates[1],
                longitude: ride.pickupLocation.coordinates[0],
              }}
              title="Ride Request"
              description={`₱${ride.fare.toFixed(2)} • ${(ride.distance / 1000).toFixed(1)}km`}
              onPress={() => setSelectedRide(ride)}
            >
              <View style={styles.rideRequestMarker}>
                <Ionicons name="car" size={24} color="#FF6B35" />
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Ride Request Details Modal */}
        {selectedRide && (
          <View style={styles.rideRequestModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ride Request</Text>
              <TouchableOpacity onPress={() => setSelectedRide(null)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.rideDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="location" size={20} color="#0d4217" />
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Pickup</Text>
                  <Text style={styles.detailValue}>{selectedRide.pickupLocation.address}</Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <Ionicons name="flag" size={20} color="#e74c3c" />
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Destination</Text>
                  <Text style={styles.detailValue}>{selectedRide.dropoffLocation.address}</Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <Ionicons name="cash" size={20} color="#0d4217" />
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Fare</Text>
                  <Text style={styles.detailValue}>₱{selectedRide.fare.toFixed(2)}</Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <Ionicons name="time" size={20} color="#0d4217" />
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Distance</Text>
                  <Text style={styles.detailValue}>{(selectedRide.distance / 1000).toFixed(1)} km</Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <Ionicons name="navigate" size={20} color="#0d4217" />
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Distance to Pickup</Text>
                  <Text style={styles.detailValue}>
                    {(calculateDistance(
                      currentLocation.latitude,
                      currentLocation.longitude,
                      selectedRide.pickupLocation.coordinates[1],
                      selectedRide.pickupLocation.coordinates[0]
                    ) / 1000).toFixed(1)} km
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => acceptRide(selectedRide.id)}
              >
                <Text style={styles.acceptButtonText}>Accept Ride</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.declineButton}
                onPress={() => setSelectedRide(null)}
              >
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Recenter Button */}
        <TouchableOpacity 
          style={styles.recenterButton}
          onPress={getCurrentLocation}
        >
          <Ionicons name="locate" size={24} color="#0d4217" />
        </TouchableOpacity>

        {/* Ride Requests Counter */}
        {isAvailable && rideRequests.length > 0 && (
          <View style={styles.requestsCounter}>
            <Text style={styles.counterText}>{rideRequests.length} ride request{rideRequests.length !== 1 ? 's' : ''}</Text>
          </View>
        )}
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
  rideRequestMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#FF6B35',
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
  requestsCounter: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  counterText: {
    color: '#0d4217',
    fontWeight: 'bold',
    fontSize: 14,
  },
  rideRequestModal: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0d4217',
  },
  rideDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#0d4217',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
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
