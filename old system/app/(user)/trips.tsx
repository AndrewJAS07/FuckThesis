import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { supabase } from '@/lib/supabase';
import { MapPin, Clock, Star } from 'lucide-react-native';

type Trip = {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  status: 'completed' | 'cancelled' | 'in_progress';
  created_at: string;
  rating?: number;
  fare: number;
};

export default function TripsScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTrip = ({ item }: { item: Trip }) => (
    <View style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <Text style={styles.date}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <Text style={[
          styles.status,
          item.status === 'completed' ? styles.statusCompleted :
          item.status === 'cancelled' ? styles.statusCancelled :
          styles.statusInProgress
        ]}>
          {item.status.replace('_', ' ')}
        </Text>
      </View>

      <View style={styles.locations}>
        <View style={styles.locationRow}>
          <MapPin color="#10b981" size={20} />
          <Text style={styles.locationText}>{item.pickup_location}</Text>
        </View>
        <View style={styles.locationRow}>
          <MapPin color="#ef4444" size={20} />
          <Text style={styles.locationText}>{item.dropoff_location}</Text>
        </View>
      </View>

      <View style={styles.tripFooter}>
        <View style={styles.fareContainer}>
          <Text style={styles.fareLabel}>Fare</Text>
          <Text style={styles.fareAmount}>${item.fare.toFixed(2)}</Text>
        </View>

        {item.rating && (
          <View style={styles.ratingContainer}>
            <Star color="#fbbf24" fill="#fbbf24" size={16} />
            <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading trips...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={trips}
        renderItem={renderTrip}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Clock size={48} color="#9ca3af" />
            <Text style={styles.emptyStateText}>No trips yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  listContent: {
    padding: 16,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  date: {
    fontSize: 14,
    color: '#6b7280',
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    textTransform: 'capitalize',
  },
  statusCompleted: {
    backgroundColor: '#d1fae5',
    color: '#059669',
  },
  statusCancelled: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  },
  statusInProgress: {
    backgroundColor: '#e0f2fe',
    color: '#0284c7',
  },
  locations: {
    gap: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  fareContainer: {
    gap: 4,
  },
  fareLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  fareAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 16,
    color: '#6b7280',
  },
}); 