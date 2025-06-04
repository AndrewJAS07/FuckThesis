import React, { useState } from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';

export default function WaitingCommuter() {
  const router = useRouter();
  const [region, setRegion] = useState({
    latitude: 13.6195,  // Naga City coordinates
    longitude: 123.1814,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>Hang tight – your e-trike driver will accept shortly</Text>
        </View>
      </View>

      {/* Map Content */}
      <View style={styles.mapContainer}>
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
        {/* Circular Loading Animation */}
        <View style={styles.loadingCircle}>
          <View style={styles.innerCircle}>
            <Image 
              source={require('../assets/images/waiting.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          {/* Yellow Dots */}
          {[...Array(8)].map((_, index) => (
            <View
              key={index}
              style={[
                styles.loadingDot,
                {
                  transform: [
                    { rotate: `${index * 45}deg` },
                    { translateY: -35 }
                  ]
                }
              ]}
            />
          ))}
        </View>
      </View>

      {/* Cancel Button */}
      <TouchableOpacity 
        style={styles.cancelButton}
        onPress={() => router.back()}
      >
        <Text style={styles.cancelButtonText}>CANCEL</Text>
      </TouchableOpacity>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Link href="/dashboardcommuter" style={[styles.navItem, styles.inactiveNavItem]}>
          <Ionicons name="home" size={24} color="#004D00" style={styles.inactiveIcon} />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  statusContainer: {
    flex: 1,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 100,
    height: 100,
    marginLeft: -50,
    marginTop: -50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoImage: {
    width: 40,
    height: 40,
  },
  loadingDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
  },
  cancelButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 16,
    margin: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 90,
  },
  cancelButtonText: {
    color: '#fff',
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