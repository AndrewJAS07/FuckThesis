import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Car, DollarSign, Star, Clock, Navigation2 } from 'lucide-react-native';

export default function DriverDashboard() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profile}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&q=80' }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.name}>John Doe</Text>
            <Text style={styles.rating}>
              <Star size={16} color="#FFD700" /> 4.8 (156 rides)
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.statusButton}>
          <Text style={styles.statusText}>Online</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        <View style={styles.statCard}>
          <DollarSign size={24} color="#10b981" />
          <Text style={styles.statValue}>$1,248</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
        <View style={styles.statCard}>
          <Navigation2 size={24} color="#3b82f6" />
          <Text style={styles.statValue}>1,432</Text>
          <Text style={styles.statLabel}>Total Rides</Text>
        </View>
        <View style={styles.statCard}>
          <Clock size={24} color="#8b5cf6" />
          <Text style={styles.statValue}>32h</Text>
          <Text style={styles.statLabel}>Online Hours</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Rides</Text>
        {[1, 2, 3].map((_, index) => (
          <View key={index} style={styles.rideCard}>
            <View style={styles.rideHeader}>
              <View style={styles.rideInfo}>
                <Text style={styles.rideTime}>Today, 2:30 PM</Text>
                <Text style={styles.rideAmount}>$24.50</Text>
              </View>
              <View style={styles.rideStatus}>
                <Text style={styles.rideStatusText}>Completed</Text>
              </View>
            </View>
            <View style={styles.rideRoute}>
              <View style={styles.routePoint}>
                <View style={[styles.dot, styles.startDot]} />
                <Text style={styles.routeText}>123 Main St</Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routePoint}>
                <View style={[styles.dot, styles.endDot]} />
                <Text style={styles.routeText}>456 Market St</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#000',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  rating: {
    color: '#fff',
    opacity: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 10,
  },
  statLabel: {
    color: '#666',
    marginTop: 5,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  rideCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  rideInfo: {
    gap: 5,
  },
  rideTime: {
    color: '#666',
  },
  rideAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
  rideStatus: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  rideStatusText: {
    color: '#10b981',
    fontWeight: '500',
  },
  rideRoute: {
    gap: 10,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  startDot: {
    backgroundColor: '#10b981',
  },
  endDot: {
    backgroundColor: '#ef4444',
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#e5e7eb',
    marginLeft: 3,
  },
  routeText: {
    color: '#374151',
  },
});