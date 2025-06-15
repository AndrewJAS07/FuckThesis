import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import { authAPI } from '../../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginCommuter() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.login(email, password);
      
      // Store the token and user data
      await AsyncStorage.setItem('token', response.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.user));
      
      // Navigate based on user role
      if (response.user.role === 'commuter') {
        router.push('/(commuter)/dashboard');
      } else if (response.user.role === 'driver') {
        router.push('/(driver)/dashboard');
      } else {
        Alert.alert('Error', 'This login is for commuters only');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <View style={styles.backButtonCircle}>
          <AntDesign name="left" size={20} color="#FFD700" />
        </View>
      </TouchableOpacity>

      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image 
          style={styles.logoImage}
          source={require('../../assets/images/eyytrike1.png')}
          resizeMode="contain"
        />
      </View>

      {/* Input Fields */}
      <View style={styles.inputsContainer}>
        <View style={styles.inputContainer}>
          <AntDesign name="user" size={20} color="#FFD700" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email or Phone"
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputContainer}>
          <AntDesign name="lock" size={20} color="#FFD700" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
      </View>

      {/* Form Container */}
      <View style={styles.formContainer}>
        <TouchableOpacity onPress={() => router.push('/forgot-password')}>
          <Text style={styles.forgotPassword}>Forgot Password?</Text>
        </TouchableOpacity>

        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.orText}>or</Text>

          <TouchableOpacity 
            style={styles.createAccountButton}
            onPress={() => router.push('/signupcommuter')}
          >
            <Text style={styles.createAccountText}>Create an account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B4619',
    padding: 20,
  },
  backButton: {
    marginTop: 40,
    marginBottom: 20,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 200,
    height: 100,
  },
  inputsContainer: {
    gap: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
  },
  formContainer: {
    marginTop: 30,
  },
  forgotPassword: {
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 20,
  },
  actionContainer: {
    gap: 15,
  },
  loginButton: {
    backgroundColor: '#FFD700',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#0B4619',
    fontSize: 18,
    fontWeight: 'bold',
  },
  orText: {
    color: '#ffffff',
    textAlign: 'center',
    marginVertical: 10,
  },
  createAccountButton: {
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createAccountText: {
    color: '#FFD700',
    fontSize: 16,
  },
}); 