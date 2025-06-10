import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { MapPin, Navigation, Wallet, Car } from 'lucide-react-native';

interface DriverDashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    wallet_balance: number;
  };
}

export function DriverDashboard({ user }: DriverDashboardProps) {
  const router = useRouter();
  const [availableRides, setAvailableRides] = useState<any[]>([]);
  const [activeRides, setActiveRides] = useState<any[]>([]);

  useEffect(() => {
    fetchRides();
  }, []);

  const fetchRides = async () => {
    try {
      // Fetch available rides
      const { data: availableData, error: availableError } = await supabase
        .from('rides')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (availableError) throw availableError;
      setAvailableRides(availableData || []);

      // Fetch active rides
      const { data: activeData, error: activeError } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', user.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      if (activeError) throw activeError;
      setActiveRides(activeData || []);
    } catch (error) {
      console.error('Error fetching rides:', error);
    }
  };

  const handleAcceptRide = async (rideId: string) => {
    try {
      const { error } = await supabase
        .from('rides')
        .update({
          status: 'accepted',
          driver_id: user.id,
          accepted_at: new Date().toISOString()
        })
        .eq('id', rideId);

      if (error) throw error;
      fetchRides(); // Refresh the rides list
    } catch (error) {
      console.error('Error accepting ride:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {user.name}!</Text>
        <View style={styles.walletCard}>
          <Wallet size={24} color="#10b981" />
          <Text style={styles.balanceText}>₱{user.wallet_balance.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.statusCard}>
        <Car size={24} color="#000" />
        <Text style={styles.statusText}>Available for Rides</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Rides</Text>
        {availableRides.length === 0 ? (
          <Text style={styles.noRidesText}>No available rides</Text>
        ) : (
          availableRides.map((ride) => (
            <View key={ride.id} style={styles.rideCard}>
              <View style={styles.rideLocation}>
                <MapPin size={16} color="#666" />
                <Text style={styles.locationText}>
                  {ride.pickup.address} → {ride.destination.address}
                </Text>
              </View>
              <Text style={styles.rideFare}>₱{ride.fare.toFixed(2)}</Text>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAcceptRide(ride.id)}>
                <Text style={styles.acceptButtonText}>Accept Ride</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Rides</Text>
        {activeRides.length === 0 ? (
          <Text style={styles.noRidesText}>No active rides</Text>
        ) : (
          activeRides.map((ride) => (
            <View key={ride.id} style={styles.rideCard}>
              <View style={styles.rideLocation}>
                <MapPin size={16} color="#666" />
                <Text style={styles.locationText}>
                  {ride.pickup.address} → {ride.destination.address}
                </Text>
              </View>
              <Text style={styles.rideFare}>₱{ride.fare.toFixed(2)}</Text>
              <Text style={styles.rideStatus}>In Progress</Text>
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
  statusCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
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
  rideFare: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  rideStatus: {
    color: '#10b981',
    fontWeight: '500',
  },
  acceptButton: {
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
}); 