import React from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';

export default function ProfileCommuter() {
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
          <TouchableOpacity onPress={() => router.push('/menucommuter')}>
            <Ionicons name="menu" size={24} color="#FFD700" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>Your available balance</Text>
              <View style={styles.balanceAmount}>
                <Text style={styles.currencySymbol}>₱</Text>
                <Text style={styles.balanceValue}>550.00</Text>
                <TouchableOpacity>
                  <Ionicons name="copy-outline" size={20} color="#fff" style={styles.copyIcon} />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.depositButton}>
              <Ionicons name="wallet" size={24} color="#0d4217" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.transactionSection}>
          <Text style={styles.sectionTitle}>Transaction</Text>
          
          {/* Transaction Items */}
          <View style={styles.transactionList}>
            <View style={styles.transactionItem}>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionTitle}>SM Naga City</Text>
                <Text style={styles.transactionDate}>Friday, 8 September 2026</Text>
              </View>
              <View style={styles.transactionAmount}>
                <Text style={styles.amount}>35.00 php</Text>
                <Text style={styles.status}>Success</Text>
              </View>
            </View>

            <View style={styles.transactionItem}>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionTitle}>Naga College Foundation</Text>
                <Text style={styles.transactionDate}>Saturday, 12 June 2026</Text>
              </View>
              <View style={styles.transactionAmount}>
                <Text style={styles.amount}>25.00 php</Text>
                <Text style={styles.status}>Success</Text>
              </View>
            </View>

            <View style={styles.transactionItem}>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionTitle}>Ateneo</Text>
                <Text style={styles.transactionDate}>Sunday, 25 August 2026</Text>
              </View>
              <View style={styles.transactionAmount}>
                <Text style={styles.amount}>30.00 php</Text>
                <Text style={styles.status}>Success</Text>
              </View>
            </View>

            <View style={styles.transactionItem}>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionTitle}>Robinson</Text>
                <Text style={styles.transactionDate}>Wednesday, 10 July 2026</Text>
              </View>
              <View style={styles.transactionAmount}>
                <Text style={styles.amount}>40.00 php</Text>
                <Text style={styles.status}>Success</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

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
  balanceCard: {
    backgroundColor: '#0d4217',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ffffff20',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceLabel: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
  },
  balanceAmount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 4,
  },
  balanceValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  copyIcon: {
    marginLeft: 8,
    opacity: 0.8,
  },
  depositButton: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    padding: 12,
  },
  transactionSection: {
    flex: 1,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  transactionList: {
    gap: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff20',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionDate: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.6,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  status: {
    color: '#4CAF50',
    fontSize: 12,
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