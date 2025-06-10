import React from 'react';
import { Tabs } from 'expo-router';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { Chrome as Home, MapPin, User, Bell, Settings } from 'lucide-react-native';

export default function TabLayout() {
  const { user, userType } = useAuth();
  
  // Custom tab bar icon with badge for notifications
  const NotificationIcon = ({ color, size, focused }: { color: string; size: number; focused: boolean }) => {
    return (
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <Bell size={size} color={color} />
        {/* Example notification badge */}
        <View 
          style={{ 
            position: 'absolute',
            top: -2,
            right: -2,
            backgroundColor: colors.error,
            borderRadius: 6,
            width: 12,
            height: 12,
            justifyContent: 'center',
            alignItems: 'center',
          }} 
        />
      </View>
    );
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray[500],
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.gray[200],
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      
      {userType === 'commuter' ? (
        <Tabs.Screen
          name="rides"
          options={{
            title: 'My Rides',
            tabBarIcon: ({ color, size, focused }) => (
              <MapPin size={size} color={color} />
            ),
          }}
        />
      ) : (
        <Tabs.Screen
          name="earnings"
          options={{
            title: 'Earnings',
            tabBarIcon: ({ color, size, focused }) => (
              <Settings size={size} color={color} />
            ),
          }}
        />
      )}
      
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size, focused }) => (
            <NotificationIcon color={color} size={size} focused={focused} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

// Need to add the View component for the NotificationIcon
import { View } from 'react-native';