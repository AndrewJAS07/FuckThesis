import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { MapPin, Navigation, Wallet } from 'lucide-react-native';

interface UserDashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    wallet_balance: number;
  };
}

export function UserDashboard({ user }: UserDashboardProps) {
  const router = useRouter();
  const [recentRides, setRecentRides] = useState<any[]>([]);

  useEffect(() => {
    fetchRecentRides();
  }, []);

  const fetchRecentRides = async () => {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentRides(data || []);
    } catch (error) {
      console.error('Error fetching rides:', error);
    }
  };

  const handleBookRide = () => {
    router.push('/book-ride');
  };

  const handleTopUp = () => {
    router.push('/wallet/topup');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {user.name}!</Text>
        <View style={styles.walletCard}>
          <Wallet size={24} color="#10b981" />
          <Text style={styles.balanceText}>₱{user.wallet_balance.toFixed(2)}</Text>
          <TouchableOpacity style={styles.topUpButton} onPress={handleTopUp}>
            <Text style={styles.topUpButtonText}>Top Up</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.bookRideButton} onPress={handleBookRide}>
        <Navigation size={24} color="#fff" />
        <Text style={styles.bookRideButtonText}>Book a Ride</Text>
      </TouchableOpacity>

      <View style={styles.recentRidesSection}>
        <Text style={styles.sectionTitle}>Recent Rides</Text>
        {recentRides.length === 0 ? (
          <Text style={styles.noRidesText}>No recent rides</Text>
        ) : (
          recentRides.map((ride) => (
            <View key={ride.id} style={styles.rideCard}>
              <View style={styles.rideLocation}>
                <MapPin size={16} color="#666" />
                <Text style={styles.locationText}>
                  {ride.pickup.address} → {ride.destination.address}
                </Text>
              </View>
              <Text style={styles.rideStatus}>{ride.status}</Text>
              <Text style={styles.rideFare}>₱{ride.fare.toFixed(2)}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  walletCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceText: {
    fontSize: 20,
    fontWeight: '600',
  },
  topUpButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  topUpButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  bookRideButton: {
    backgroundColor: '#000',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  bookRideButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  recentRidesSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  noRidesText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  rideCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rideLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 16,
  },
  rideStatus: {
    color: '#10b981',
    fontWeight: '500',
    marginBottom: 4,
  },
  rideFare: {
    fontSize: 18,
    fontWeight: '600',
  },
}); 