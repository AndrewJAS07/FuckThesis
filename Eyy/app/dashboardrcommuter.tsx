import React, { useState } from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';

export default function dashboardRider() {
  const router = useRouter();
  const [region, setRegion] = useState({
    latitude: 13.6195,  // Naga City coordinates
    longitude: 123.1814,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Status Bar */}
      <View style={styles.header}>
        <View style={styles.logo}>
          <Image 
            source={require('../assets/images/eyytrike1.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Ionicons name="notifications-outline" size={24} color="#FFD700" />
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <MapView
          style={styles.map}
          initialRegion={region}
          onRegionChangeComplete={setRegion}
        >
          <Marker
            coordinate={{
              latitude: region.latitude,
              longitude: region.longitude,
            }}
          />
        </MapView>
      </View>

      {/* Book Button */}
      <TouchableOpacity 
        style={styles.bookButton}
        onPress={() => router.push('/locationcommuter')}
      >
        <Text style={styles.bookButtonText}>Book eyytrike</Text>
      </TouchableOpacity>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Link href="/dashboardcommuter" style={styles.navItem}>
          <Ionicons name="home" size={24} color="#004D00" />
        </Link>
        <Link href="/historycommuter" style={[styles.navItem, styles.inactiveNavItem]}>
          <Ionicons name="time" size={24} color="#004D00" style={styles.inactiveIcon} />
        </Link>
        <Link href="/profilecommuter" style={[styles.navItem, styles.inactiveNavItem]}>
          <Ionicons name="person" size={24} color="#004D00" style={styles.inactiveIcon} />
        </Link>
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
  },
  logoImage: {
    width: 120,
    height: 40,
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  bookButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    margin: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 90,
  },
  bookButtonText: {
    color: '#0d4217',
    fontSize: 16,
    fontWeight: 'bold',
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
    opacity: 0.7,
  },
  inactiveIcon: {
    opacity: 0.7,
  },
});
