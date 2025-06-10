import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { OTPInput } from '@/components/ui/OTPInput';
import { colors } from '@/constants/colors';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export default function VerifyScreen() {
  const params = useLocalSearchParams<{ email: string; phoneNumber: string }>();
  const { signIn } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [otpSent, setOtpSent] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Animation values
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  
  useEffect(() => {
    // Start animations when component mounts
    opacity.value = withTiming(1, { 
      duration: 600,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    
    translateY.value = withTiming(0, { 
      duration: 600,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    
    // Start the timer
    startTimer();
    
    return () => {
      // Clean up timer on unmount
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  const startTimer = () => {
    setTimeRemaining(60);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });
  
  const handleResendOTP = async () => {
    try {
      // In a real app, this would call an API to resend the OTP
      setOtpSent(true);
      startTimer();
      
      // Show success message
      Alert.alert(
        'OTP Resent',
        'A new verification code has been sent to your phone number.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to resend verification code. Please try again.');
    }
  };
  
  const handleVerifyOTP = async (code: string) => {
    try {
      setLoading(true);
      setOtpError(null);
      
      // In a real app, this would verify the OTP with your authentication service
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // For this demo, we'll accept any 6-digit code
      // In a real app, replace this with actual verification
      if (code.length === 6) {
        // Show success message and redirect to login
        Alert.alert(
          'Verification Successful',
          'Your account has been verified successfully.',
          [
            { 
              text: 'Proceed to Login', 
              onPress: () => router.replace('/login')
            }
          ]
        );
      } else {
        setOtpError('Invalid verification code. Please try again.');
      }
    } catch (error) {
      setOtpError('Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      
      <Animated.View style={[styles.content, animatedStyle]}>
        <Text style={styles.title}>Verify Your Phone</Text>
        
        <Text style={styles.subtitle}>
          We've sent a verification code to
          <Text style={styles.highlightText}> {params.phoneNumber}</Text>
        </Text>
        
        <OTPInput
          codeLength={6}
          onCodeFilled={handleVerifyOTP}
          error={otpError}
        />
        
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>
            {timeRemaining > 0 
              ? `Resend code in ${timeRemaining}s` 
              : "Didn't receive a code?"}
          </Text>
          
          {timeRemaining === 0 && (
            <TouchableOpacity
              onPress={handleResendOTP}
              disabled={loading || timeRemaining > 0}
            >
              <Text style={styles.resendText}>Resend Code</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Continue"
            onPress={() => {
              // This is just a fallback, OTPInput will call handleVerifyOTP when complete
            }}
            loading={loading}
            disabled={loading}
          />
          
          <Button
            title="Back"
            variant="text"
            onPress={() => router.back()}
            disabled={loading}
          />
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    color: colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  highlightText: {
    fontWeight: '600',
    color: colors.text.primary,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  timerText: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: 8,
  },
  resendText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
});