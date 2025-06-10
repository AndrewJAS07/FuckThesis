import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Search, Menu, Navigation, Clock } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// Mock data for recent rides
const recentRides = [
  {
    id: '1',
    destination: 'Work',
    address: '123 Business Ave',
    time: '8:30 AM',
    distance: '5.2 mi',
    image: 'https://images.pexels.com/photos/1059078/pexels-photo-1059078.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    id: '2',
    destination: 'Home',
    address: '456 Residential St',
    time: '6:15 PM',
    distance: '4.8 mi',
    image: 'https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
];

// Mock data for nearby drivers (for commuters)
const nearbyDrivers = [
  {
    id: '1',
    name: 'John D.',
    vehicle: 'Toyota Camry',
    rating: 4.8,
    eta: '3 min',
    image: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    id: '2',
    name: 'Sarah M.',
    vehicle: 'Honda Civic',
    rating: 4.9,
    eta: '5 min',
    image: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
];

// Mock data for available ride requests (for drivers)
const availableRides = [
  {
    id: '1',
    passenger: 'Michael R.',
    pickup: 'Downtown Station',
    destination: 'Airport Terminal 2',
    distance: '12.3 mi',
    fare: '$24.50',
    image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    id: '2',
    passenger: 'Emily T.',
    pickup: 'Central Park',
    destination: 'Shopping Mall',
    distance: '3.7 mi',
    fare: '$12.80',
    image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
];

export default function HomeScreen() {
  const { user, userType, loading } = useAuth();
  const [greeting, setGreeting] = useState('Good morning');
  const windowWidth = Dimensions.get('window').width;
  
  // Animation values
  const headerOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  
  useEffect(() => {
    // Determine greeting based on time of day
    const currentHour = new Date().getHours();
    if (currentHour < 12) {
      setGreeting('Good morning');
    } else if (currentHour < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }
    
    // Start animations
    headerOpacity.value = withTiming(1, { 
      duration: 500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    
    setTimeout(() => {
      contentOpacity.value = withTiming(1, { 
        duration: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
      
      translateY.value = withTiming(0, { 
        duration: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    }, 200);
  }, []);
  
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: headerOpacity.value,
    };
  });
  
  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  const renderCommuterContent = () => (
    <>
      <View style={styles.searchContainer}>
        <TouchableOpacity style={styles.searchBar}>
          <Search size={20} color={colors.text.secondary} />
          <Text style={styles.searchText}>Where are you going?</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity style={styles.quickAction}>
          <View style={styles.quickActionIcon}>
            <MapPin size={20} color={colors.primary} />
          </View>
          <Text style={styles.quickActionText}>Work</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickAction}>
          <View style={styles.quickActionIcon}>
            <MapPin size={20} color={colors.primary} />
          </View>
          <Text style={styles.quickActionText}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickAction}>
          <View style={styles.quickActionIcon}>
            <Navigation size={20} color={colors.primary} />
          </View>
          <Text style={styles.quickActionText}>New</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.sectionTitle}>Recent Rides</Text>
      
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recentRidesContainer}
      >
        {recentRides.map(ride => (
          <TouchableOpacity 
            key={ride.id}
            style={[styles.recentRideCard, { width: windowWidth * 0.7 }]}
          >
            <Image 
              source={{ uri: ride.image }}
              style={styles.recentRideImage}
            />
            <View style={styles.recentRideInfo}>
              <Text style={styles.recentRideDestination}>{ride.destination}</Text>
              <Text style={styles.recentRideAddress}>{ride.address}</Text>
              <View style={styles.recentRideDetails}>
                <Clock size={14} color={colors.text.secondary} />
                <Text style={styles.recentRideTime}>{ride.time}</Text>
                <Text style={styles.recentRideDistance}>{ride.distance}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <Text style={styles.sectionTitle}>Nearby Drivers</Text>
      
      {nearbyDrivers.map(driver => (
        <TouchableOpacity 
          key={driver.id}
          style={styles.driverCard}
        >
          <Image 
            source={{ uri: driver.image }}
            style={styles.driverImage}
          />
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{driver.name}</Text>
            <Text style={styles.driverVehicle}>{driver.vehicle}</Text>
            <View style={styles.driverDetails}>
              <Text style={styles.driverRating}>★ {driver.rating}</Text>
              <Text style={styles.driverEta}>{driver.eta} away</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </>
  );
  
  const renderDriverContent = () => (
    <>
      <View style={styles.driverStatusContainer}>
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: colors.accent.green }]} />
          <Text style={styles.statusText}>Online - Ready for Rides</Text>
        </View>
        
        <TouchableOpacity style={styles.toggleButton}>
          <Text style={styles.toggleButtonText}>Go Offline</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.sectionTitle}>Available Ride Requests</Text>
      
      {availableRides.map(ride => (
        <TouchableOpacity 
          key={ride.id}
          style={styles.rideRequestCard}
        >
          <View style={styles.rideRequestHeader}>
            <Image 
              source={{ uri: ride.image }}
              style={styles.passengerImage}
            />
            <View>
              <Text style={styles.passengerName}>{ride.passenger}</Text>
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingText}>★ 4.8</Text>
              </View>
            </View>
            <View style={styles.fareContainer}>
              <Text style={styles.fareAmount}>{ride.fare}</Text>
              <Text style={styles.fareLabel}>Fare</Text>
            </View>
          </View>
          
          <View style={styles.routeContainer}>
            <View style={styles.routeIcons}>
              <View style={styles.pickupDot} />
              <View style={styles.routeLine} />
              <View style={styles.destinationDot} />
            </View>
            <View style={styles.routeDetails}>
              <Text style={styles.routeLocation}>{ride.pickup}</Text>
              <Text style={styles.routeLocation}>{ride.destination}</Text>
            </View>
          </View>
          
          <View style={styles.rideRequestFooter}>
            <Text style={styles.distanceText}>{ride.distance}</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.declineButton}>
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptButton}>
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      ))}
      
      <Text style={styles.sectionTitle}>Today's Summary</Text>
      
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>$68.40</Text>
          <Text style={styles.summaryLabel}>Earnings</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>3</Text>
          <Text style={styles.summaryLabel}>Rides</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>42.5 mi</Text>
          <Text style={styles.summaryLabel}>Distance</Text>
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <Animated.View style={[styles.header, headerAnimatedStyle]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.username}>{user?.firstName || 'User'}</Text>
          </View>
          
          <TouchableOpacity style={styles.menuButton}>
            <Menu size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </Animated.View>
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={contentAnimatedStyle}>
          {userType === 'commuter' 
            ? renderCommuterContent() 
            : renderDriverContent()}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  searchContainer: {
    marginBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.gray[100],
    borderRadius: 12,
  },
  searchText: {
    marginLeft: 12,
    fontSize: 16,
    color: colors.text.secondary,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: colors.text.primary,
  },
  recentRidesContainer: {
    paddingBottom: 8,
    gap: 16,
  },
  recentRideCard: {
    borderRadius: 16,
    backgroundColor: colors.background,
    overflow: 'hidden',
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  recentRideImage: {
    width: '100%',
    height: 120,
  },
  recentRideInfo: {
    padding: 16,
  },
  recentRideDestination: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  recentRideAddress: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  recentRideDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentRideTime: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 4,
    marginRight: 8,
  },
  recentRideDistance: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  driverCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  driverImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  driverInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  driverVehicle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  driverDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverRating: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.accent.amber,
    marginRight: 16,
  },
  driverEta: {
    fontSize: 14,
    color: colors.accent.green,
    fontWeight: '500',
  },
  driverStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.gray[100],
    borderRadius: 16,
    marginBottom: 24,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  rideRequestCard: {
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  rideRequestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  passengerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: colors.accent.amber,
    fontWeight: '500',
  },
  fareContainer: {
    marginLeft: 'auto',
    alignItems: 'flex-end',
  },
  fareAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent.green,
    marginBottom: 4,
  },
  fareLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  routeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  routeIcons: {
    marginRight: 12,
    alignItems: 'center',
    width: 16,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    marginBottom: 6,
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: colors.gray[300],
    marginVertical: 2,
  },
  destinationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent.red,
    marginTop: 6,
  },
  routeDetails: {
    flex: 1,
    justifyContent: 'space-between',
    height: 70,
  },
  routeLocation: {
    fontSize: 14,
    color: colors.text.primary,
  },
  rideRequestFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  distanceText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  declineButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  declineButtonText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  acceptButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  acceptButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '500',
  },
  summaryCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
});