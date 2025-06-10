import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react-native';
import { resetPassword } from '@/lib/supabase';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// Reset password form validation schema
const resetSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ResetFormData = z.infer<typeof resetSchema>;

export default function ResetPasswordScreen() {
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  
  // Animation values
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  
  React.useEffect(() => {
    // Start animations when component mounts
    opacity.value = withTiming(1, { 
      duration: 600,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    
    translateY.value = withTiming(0, { 
      duration: 600,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });
  
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: '',
    },
  });
  
  const onSubmit = async (data: ResetFormData) => {
    try {
      setLoading(true);
      
      const { error } = await resetPassword(data.email);
      
      if (error) {
        Alert.alert('Reset Failed', error.message);
        return;
      }
      
      setResetSent(true);
      
      // In a real app, this would redirect to a reset password screen
      // For this demo, we'll just show a success message
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <StatusBar style="dark" />
      
      <Animated.View style={[styles.content, animatedStyle]}>
        {!resetSent ? (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we'll send you a link to reset your password
              </Text>
            </View>
            
            <View style={styles.formContainer}>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Email Address"
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    leftIcon={<Mail size={20} color={colors.text.secondary} />}
                  />
                )}
              />
            </View>
            
            <View style={styles.buttonContainer}>
              <Button
                title="Send Reset Link"
                onPress={handleSubmit(onSubmit)}
                loading={loading}
              />
              
              <Button
                title="Back to Login"
                variant="text"
                onPress={() => router.back()}
                disabled={loading}
              />
            </View>
          </>
        ) : (
          <View style={styles.successContainer}>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.successText}>
              We've sent a password reset link to your email. Please check your inbox and follow the instructions to reset your password.
            </Text>
            
            <View style={styles.successButtonContainer}>
              <Button
                title="Back to Login"
                onPress={() => router.replace('/login')}
              />
            </View>
          </View>
        )}
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
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  formContainer: {
    marginBottom: 24,
  },
  buttonContainer: {
    gap: 16,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  successButtonContainer: {
    width: '100%',
  },
});