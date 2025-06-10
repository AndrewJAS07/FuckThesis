import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// Login form validation schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  
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
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  
  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoading(true);
      
      const { data: authData, error } = await signIn(data.email, data.password);
      
      if (error) {
        Alert.alert('Login Failed', error.message);
        return;
      }
      
      router.replace('/(tabs)');
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
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Log in to your RideX account to continue
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
          
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Enter your password"
                secureTextEntry
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                leftIcon={<Lock size={20} color={colors.text.secondary} />}
              />
            )}
          />
          
          <TouchableOpacity
            style={styles.forgotPasswordContainer}
            onPress={() => router.push('/reset-password')}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Log In"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
          />
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <Link href="/user-type" asChild>
            <Button
              title="Sign Up"
              variant="text"
              onPress={() => {}}
              textStyle={styles.signUpButtonText}
            />
          </Link>
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
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  formContainer: {
    marginBottom: 24,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  signUpButtonText: {
    fontWeight: '600',
  },
});