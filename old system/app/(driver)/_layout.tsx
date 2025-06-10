import { Tabs } from 'expo-router';
import { MapPin, Clock, User, DollarSign } from 'lucide-react-native';

export default function DriverLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Available Rides',
          tabBarIcon: ({ color }) => <MapPin color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'My Trips',
          tabBarIcon: ({ color }) => <Clock color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color }) => <DollarSign color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}