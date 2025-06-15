import React, { useState } from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';

export default function dashboardRider() {
  const [isAvailable, setIsAvailable] = useState(false);

  const toggleAvailability = () => {
    setIsAvailable(!isAvailable);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Status Bar */}
      <View style={styles.header}>
        <View style={styles.logo}>
          <Image 
            source={require('../../assets/images/eyytrike1.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Ionicons name="notifications-outline" size={24} color="#FFD700" />
        </View>
        <TouchableOpacity 
          style={[styles.statusBar, isAvailable ? styles.statusBarOn : styles.statusBarOff]} 
          onPress={toggleAvailability}
        >
          <Text style={styles.statusText}>
            {isAvailable ? 'Available for ride now!' : 'You are not available for ride now!'}
          </Text>
          <View style={[styles.toggleButton, isAvailable ? styles.toggleOn : styles.toggleOff]}>
            <Text style={styles.toggleText}>{isAvailable ? 'On' : 'Off'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Image 
          source={require('../../assets/images/naga-map.png')}
          style={styles.mapImage}
          resizeMode="cover"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    backgroundColor: '#0d4217',
    padding: 16,
  },
  logo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    paddingLeft: 10,
    marginBottom: 8,
  },
  logoImage: {
    width: 120,
    height: 32,
    marginLeft: -20,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#083010',
  },
  statusBarOn: {
    backgroundColor: '#004D00',
  },
  statusBarOff: {
    backgroundColor: '#083010',
  },
  statusText: {
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 45,
    alignItems: 'center',
  },
  toggleOn: {
    backgroundColor: '#FFD700',
  },
  toggleOff: {
    backgroundColor: '#666',
  },
  toggleText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  content: {
    flex: 1,
    width: '100%',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#bed2d0',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  navItem: {
    alignItems: 'center',
    padding: 10,
  },
  inactiveNavItem: {
    opacity: 0.5,
  },
  inactiveIcon: {
    opacity: 0.5,
  },
});
