import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Lock Icon */}
      <View style={styles.lockIconContainer}>
        <AntDesign name="lock1" size={70} color="#0d4217" />
      </View>

      {/* Title */}
      <Text style={styles.title}>Forgot</Text>
      <Text style={styles.titleSecondLine}>Password?</Text>
      
      {/* Subtitle */}
      <Text style={styles.subtitle}>No worries, we'll send you{'\n'}reset instructions</Text>

      {/* Form Wrapper */}
      <View style={styles.formWrapper}>
        <View style={styles.formContainer}>
          <Text style={styles.label}>Mobile Number</Text>
          <View style={styles.inputContainer}>
            <AntDesign name="phone" size={20} color="#0d4217" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your Mobile number"
              placeholderTextColor="#666666"
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Reset Password</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.backToLoginButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToLoginText}>Back to Login</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <View style={styles.iconSquare}>
              <AntDesign name="arrowleft" size={20} color="#0d4217" />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  closeButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  lockIconContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#0d4217',
    textAlign: 'center',
    marginTop: 20,
  },
  titleSecondLine: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#0d4217',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 25,
    lineHeight: 20,
  },
  formWrapper: {
    flex: 1,
    backgroundColor: '#0d4217',
    marginTop: 80,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  formContainer: {
    padding: 20,
    marginTop: 20,
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#000000',
    fontSize: 16,
  },
  resetButton: {
    backgroundColor: '#E0E0E0',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  resetButtonText: {
    color: '#0d4217',
    fontSize: 16,
    fontWeight: '600',
  },
  backToLoginButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backToLoginText: {
    color: '#ffffff',
    fontSize: 16,
    
  },
  iconSquare: {
    width: 30,
    height: 30,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 