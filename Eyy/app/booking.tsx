import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { rideAPI } from '../lib/api';

interface BookingData {
  pickup: {
    latitude: number;
    longitude: number;
    address: string;
  };
  destination: {
    latitude: number;
    longitude: number;
    address: string;
  };
  timestamp: string;
  status: string;
  estimatedFare: number;
  distance: number;
}

const BookingScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [region, setRegion] = useState({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [rideId, setRideId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Parse the parameters from the location screen
    const pickupLat = parseFloat(params.pickupLat as string);
    const pickupLng = parseFloat(params.pickupLng as string);
    const destLat = parseFloat(params.destLat as string);
    const destLng = parseFloat(params.destLng as string);
    const distance = parseFloat(params.distance as string);
    const fare = parseFloat(params.fare as string);

    if (isNaN(pickupLat) || isNaN(pickupLng) || isNaN(destLat) || isNaN(destLng) || isNaN(distance) || isNaN(fare)) {
      setError('Invalid booking data');
      setIsLoading(false);
      return;
    }

    const data: BookingData = {
      pickup: {
        latitude: pickupLat,
        longitude: pickupLng,
        address: params.pickupAddress as string || 'Current Location'
      },
      destination: {
        latitude: destLat,
        longitude: destLng,
        address: params.destAddress as string || 'Selected Destination'
      },
      timestamp: params.timestamp as string || new Date().toISOString(),
      status: 'pending',
      estimatedFare: fare,
      distance: distance
    };

    setBookingData(data);
    
    // Set initial map region to show both pickup and destination
    const centerLat = (data.pickup.latitude + data.destination.latitude) / 2;
    const centerLon = (data.pickup.longitude + data.destination.longitude) / 2;
    setRegion({
      latitude: centerLat,
      longitude: centerLon,
      latitudeDelta: Math.abs(data.pickup.latitude - data.destination.latitude) * 1.5,
      longitudeDelta: Math.abs(data.pickup.longitude - data.destination.longitude) * 1.5,
    });

    // Create ride in backend
    createRide(data);
  }, [params]);

  const createRide = async (data: BookingData) => {
    try {
      setIsLoading(true);
      const response = await rideAPI.createRide({
        pickupLocation: {
          type: 'Point',
          coordinates: [data.pickup.longitude, data.pickup.latitude],
          address: data.pickup.address
        },
        dropoffLocation: {
          type: 'Point',
          coordinates: [data.destination.longitude, data.destination.latitude],
          address: data.destination.address
        },
        fare: data.estimatedFare,
        distance: data.distance,
        duration: Math.ceil(data.distance / 1000 * 3), // Rough estimate: 3 minutes per km
        paymentMethod: 'cash',
        status: 'pending'
      });
      setRideId(response.id);
      setError(null);
    } catch (err) {
      console.error('Error creating ride:', err);
      setError('Failed to create ride. Please try again.');
      Alert.alert('Error', 'Failed to create ride. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for ride status updates
  useEffect(() => {
    if (!rideId) return;

    const pollInterval = setInterval(async () => {
      try {
        const ride = await rideAPI.getRideById(rideId);
        if (ride.status === 'accepted') {
          // Navigate to ride in progress screen
          router.replace({
            pathname: '/(commuter)/ride',
            params: { rideId }
          });
        } else if (ride.status === 'cancelled') {
          Alert.alert('Ride Cancelled', 'The ride has been cancelled.');
          router.back();
        }
      } catch (err) {
        console.error('Error polling ride status:', err);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [rideId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancelBooking = async () => {
    if (!rideId) {
      router.back();
      return;
    }

    try {
      setIsLoading(true);
      await rideAPI.updateRideStatus(rideId, 'cancelled');
      router.back();
    } catch (err) {
      console.error('Error cancelling ride:', err);
      Alert.alert('Error', 'Failed to cancel ride. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!bookingData || isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0d4217" />
          <Text style={styles.loadingText}>Creating your ride...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => bookingData && createRide(bookingData)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancelBooking} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Waiting for Driver</Text>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {/* Pickup Marker */}
          <Marker
            coordinate={{
              latitude: bookingData.pickup.latitude,
              longitude: bookingData.pickup.longitude,
            }}
            title="Pickup Location"
          >
            <View style={styles.pickupMarker}>
              <Ionicons name="location" size={30} color="#0d4217" />
            </View>
          </Marker>

          {/* Destination Marker */}
          <Marker
            coordinate={{
              latitude: bookingData.destination.latitude,
              longitude: bookingData.destination.longitude,
            }}
            title="Destination"
          >
            <View style={styles.destinationMarker}>
              <Ionicons name="flag" size={30} color="#FF0000" />
            </View>
          </Marker>

          {/* Direct Path */}
          <Polyline
            coordinates={[
              {
                latitude: bookingData.pickup.latitude,
                longitude: bookingData.pickup.longitude,
              },
              {
                latitude: bookingData.destination.latitude,
                longitude: bookingData.destination.longitude,
              },
            ]}
            strokeColor="#0d4217"
            strokeWidth={3}
          />
        </MapView>
      </View>

      {/* Booking Info */}
      <View style={styles.bookingInfo}>
        <View style={styles.timerContainer}>
          <Ionicons name="time-outline" size={24} color="#0d4217" />
          <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.detailTitle}>Estimated Fare</Text>
          <Text style={styles.detailValue}>₱{bookingData.estimatedFare.toFixed(2)}</Text>
          
          <Text style={styles.detailTitle}>Distance</Text>
          <Text style={styles.detailValue}>{(bookingData.distance / 1000).toFixed(1)} km</Text>
        </View>

        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={handleCancelBooking}
        >
          <Text style={styles.cancelButtonText}>Cancel Booking</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

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
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  pickupMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0d4217',
    marginLeft: 8,
  },
  detailsContainer: {
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0d4217',
    marginBottom: 12,
  },
  cancelButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: '#FF0000',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#0d4217',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#0d4217',
    fontWeight: 'bold',
  },
});

export default BookingScreen;