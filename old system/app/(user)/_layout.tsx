import { Tabs } from 'expo-router';
import { MapPin, Clock, User } from 'lucide-react-native';

export default function UserLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Book Ride',
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
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
    </Tabs>
  );
} 