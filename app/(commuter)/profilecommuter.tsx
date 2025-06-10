import React from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileCommuter() {
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
          <Ionicons name="notifications-outline" size={24} color="#FFD700" />
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
              <Ionicons name="wallet-outline" size={20} color="#004D00" />
            </View>
            <Text style={styles.statsLabel}>Total Earning</Text>
          </View>

          {/* Complete Ride */}
          <View style={styles.statsCard}>
            <Text style={styles.statsValue}>0</Text>
            <View style={styles.statsIconContainer}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#004D00" />
            </View>
            <Text style={styles.statsLabel}>Complete Ride</Text>
          </View>

          {/* Pending Ride */}
          <View style={styles.statsCard}>
            <Text style={styles.statsValue}>0</Text>
            <View style={styles.statsIconContainer}>
              <Ionicons name="time-outline" size={20} color="#004D00" />
            </View>
            <Text style={styles.statsLabel}>Pending Ride</Text>
          </View>

          {/* Cancel Ride */}
          <View style={styles.statsCard}>
            <Text style={styles.statsValue}>0</Text>
            <View style={styles.statsIconContainer}>
              <Ionicons name="close-circle-outline" size={20} color="#004D00" />
            </View>
            <Text style={styles.statsLabel}>Cancel Ride</Text>
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
    gap: 16,
  },
  statsCard: {
    width: '47%',
    backgroundColor: '#0d4217',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffffff20',
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  statsIconContainer: {
    backgroundColor: '#FFD700',
    borderRadius: 20,
    padding: 8,
    marginBottom: 8,
  },
  statsLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
}); 