import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { Link } from 'expo-router';

export default function Page() {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../assets/images/eyytrike1.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <Link href="/logincommuter" asChild>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Commuter</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/loginrider" asChild>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Rider</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d4217', // Dark green background
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    marginBottom: 50,
    alignItems: 'center',
  },
  logoImage: {
    width: 350,
    height: 140,
  },
  buttonContainer: {
    width: '100%',
    gap: 20,
  },
  button: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 10,
    padding: 15,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '600',
  },
});
