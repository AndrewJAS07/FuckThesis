import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CommuterLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#bed2d0',
        },
        tabBarActiveTintColor: '#004D00',
        tabBarInactiveTintColor: 'rgba(0, 77, 0, 0.7)',
      }}
    >
      <Tabs.Screen
        name="dashboardcommuter"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          tabBarShowLabel: false,
        }}
      />
      <Tabs.Screen
        name="historycommuter"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
          tabBarShowLabel: false,
        }}
      />
      <Tabs.Screen
        name="profilecommuter"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
          tabBarShowLabel: false,
        }}
      />
    </Tabs>
  );
} 