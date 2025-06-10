import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CreditCard, Plus } from 'lucide-react-native';
import { useState } from 'react';

interface WalletCardProps {
  balance: number;
  onTopUp: (amount: number) => void;
}

export default function WalletCard({ balance, onTopUp }: WalletCardProps) {
  const [isTopUpVisible, setIsTopUpVisible] = useState(false);

  const topUpAmounts = [10, 20, 50, 100];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <CreditCard size={24} color="#fff" />
        <Text style={styles.title}>Wallet Balance</Text>
      </View>
      
      <Text style={styles.balance}>${balance.toFixed(2)}</Text>
      
      {isTopUpVisible ? (
        <View style={styles.topUpContainer}>
          <Text style={styles.topUpTitle}>Select amount to top up</Text>
          <View style={styles.amountGrid}>
            {topUpAmounts.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={styles.amountButton}
                onPress={() => onTopUp(amount)}>
                <Text style={styles.amountText}>${amount}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.topUpButton}
          onPress={() => setIsTopUpVisible(true)}>
          <Plus size={20} color="#fff" />
          <Text style={styles.topUpButtonText}>Top Up</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderRadius: 15,
    padding: 20,
    margin: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  balance: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 20,
  },
  topUpButton: {
    backgroundColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  topUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  topUpContainer: {
    marginTop: 15,
  },
  topUpTitle: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  amountButton: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
  },
  amountText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});