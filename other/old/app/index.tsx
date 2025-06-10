import React, { useEffect } from 'react';
import { StyleSheet, View, Image, Text } from 'react-native';
import { Link, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/constants/colors';

export default function WelcomeScreen() {
  const { user, loading } = useAuth();
  
  // Animation values
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  
  useEffect(() => {
    // Start animations when component mounts
    opacity.value = withTiming(1, { 
      duration: 800,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    
    translateY.value = withTiming(0, { 
      duration: 800,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    
    // If user is already logged in, navigate to app home
    if (user && !loading) {
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 1000);
    }
  }, [user, loading]);
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <Animated.View style={[styles.content, animatedStyle]}>
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: 'https://images.pexels.com/photos/2422277/pexels-photo-2422277.jpeg?auto=compress&cs=tinysrgb&w=600' }}
            style={styles.logoBackground}
          />
          <View style={styles.logoOverlay}>
            <Text style={styles.logoText}>EyyTrike</Text>
          </View>
        </View>
        
        <Text style={styles.title}>Welcome to EyyTrike</Text>
        <Text style={styles.subtitle}>
          Your secure ride-hailing app for all your transportation needs
        </Text>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Get Started"
            onPress={() => router.push('/user-type')}
            style={styles.button}
          />
          
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <Link href="/login" asChild>
              <Button
                title="Log In"
                variant="text"
                onPress={() => {}}
                textStyle={styles.loginButtonText}
              />
            </Link>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 32,
  },
  logoBackground: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  logoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 122, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: 'white',
    fontSize: 28,
    fontWeight: '800',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
  },
  button: {
    width: '100%',
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  loginButtonText: {
    fontWeight: '600',
  },
});