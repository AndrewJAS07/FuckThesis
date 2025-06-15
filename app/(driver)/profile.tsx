import React from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';

export default function ProfileRider() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logo}>
          <Image 
            source={require('../../assets/images/eyytrike1.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <TouchableOpacity onPress={() => router.push('/menurider')}>
            <Ionicons name="menu" size={24} color="#FFD700" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Statistics Grid */}
        <View style={styles.statsGrid}>
          {/* Total Earning */}
          <View style={styles.statsCard}>
            <Text style={styles.statsValue}>0 Php</Text>
            <View style={styles.statsIconContainer}>
              <Ionicons name="wallet-outline" size={20} color="#fff" />
            </View>
            <Text style={styles.statsLabel}>Total{'\n'}Earning</Text>
          </View>

          {/* Complete Ride */}
          <View style={styles.statsCard}>
            <Text style={styles.statsValue}>0</Text>
            <View style={styles.statsIconContainer}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            </View>
            <Text style={styles.statsLabel}>Complete{'\n'}Ride</Text>
          </View>

          {/* Pending Ride */}
          <View style={styles.statsCard}>
            <Text style={styles.statsValue}>0</Text>
            <View style={styles.statsIconContainer}>
              <Ionicons name="time-outline" size={20} color="#fff" />
            </View>
            <Text style={styles.statsLabel}>Pending{'\n'}Ride</Text>
          </View>

          {/* Cancel Ride */}
          <View style={styles.statsCard}>
            <Text style={styles.statsValue}>0</Text>
            <View style={styles.statsIconContainer}>
              <Ionicons name="close-circle-outline" size={20} color="#fff" />
            </View>
            <Text style={styles.statsLabel}>Cancel{'\n'}Ride</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d4217',
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
  },
  logoImage: {
    width: 120,
    height: 32,
    marginLeft: -20,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  statsCard: {
    width: '48%',
    backgroundColor: '#083010',
    borderRadius: 8,
    padding: 16,
    alignItems: 'flex-start',
    marginBottom: 10,
    height: 120,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  statsIconContainer: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    padding: 8,
    marginBottom: 8,
    position: 'absolute',
    right: 8,
    top: 8,
  },
  statsLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    position: 'absolute',
    bottom: 16,
    left: 16,
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