import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Clock, Navigation2 } from 'lucide-react-native';

const MOCK_TRIPS = [
  {
    id: '1',
    date: '2024-02-20',
    from: '123 Main St',
    to: '456 Market St',
    status: 'Completed',
    price: '$25.50',
  },
  {
    id: '2',
    date: '2024-02-19',
    from: '789 Park Ave',
    to: '321 Lake View',
    status: 'Completed',
    price: '$18.75',
  },
];

export default function TripsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Trips</Text>
      
      <FlatList
        data={MOCK_TRIPS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.tripCard}>
            <View style={styles.tripHeader}>
              <Clock size={16} color="#666" />
              <Text style={styles.date}>{item.date}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            
            <View style={styles.routeContainer}>
              <View style={styles.routePoint}>
                <View style={[styles.dot, styles.startDot]} />
                <Text style={styles.routeText}>{item.from}</Text>
              </View>
              
              <View style={styles.routeLine} />
              
              <View style={styles.routePoint}>
                <View style={[styles.dot, styles.endDot]} />
                <Text style={styles.routeText}>{item.to}</Text>
              </View>
            </View>
            
            <Text style={styles.price}>{item.price}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    padding: 20,
    paddingTop: 60,
  },
  listContent: {
    padding: 20,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  date: {
    marginLeft: 5,
    color: '#666',
    fontSize: 14,
  },
  statusBadge: {
    marginLeft: 'auto',
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#374151',
  },
  routeContainer: {
    marginBottom: 15,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
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
    fontSize: 14,
    color: '#374151',
  },
  price: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'right',
  },
});