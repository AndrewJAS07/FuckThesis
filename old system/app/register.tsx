import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
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
import { SquareUser as UserSquare, Car, Mail, Phone, Lock, User } from 'lucide-react-native';

// Define the validation schema using Zod
const baseSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  phoneNumber: z.string()
    .regex(/^\+[0-9]{1,3}[0-9]{6,14}$/, 'Please enter a valid phone number with country code (e.g., +1234567890)'),
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name cannot exceed 50 characters')
    .regex(/^[a-zA-Z]+$/, 'First name must contain only letters'),
  middleName: z.string()
    .max(50, 'Middle name cannot exceed 50 characters')
    .regex(/^[a-zA-Z]*$/, 'Middle name must contain only letters')
    .optional()
    .or(z.literal('')),
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name cannot exceed 50 characters')
    .regex(/^[a-zA-Z]+$/, 'Last name must contain only letters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Driver-specific schema
const driverSchema = z.object({
  ...baseSchema.shape,
  licenseNumber: z.string()
    .min(5, 'License number is required')
    .max(20, 'License number is too long'),
  plateNumber: z.string()
    .regex(/^[A-Z]{3}-\d{4}$/, 'Plate number format should be XXX-1234'),
});

export default function RegisterScreen() {
  const { user, signUp, userType } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const schema = userType === 'driver' ? driverSchema : baseSchema;
  
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    getValues,
    trigger,
    watch,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      phoneNumber: '',
      firstName: '',
      middleName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
      ...(userType === 'driver' && {
        licenseNumber: '',
        plateNumber: '',
      }),
    },
    mode: 'onChange',
  });
  
  // Calculate max steps based on user type
  const maxSteps = userType === 'driver' ? 3 : 2;
  
  // Define the fields for each step
  const stepFields = {
    1: ['email', 'phoneNumber'],
    2: ['firstName', 'middleName', 'lastName', 'password', 'confirmPassword'],
    3: ['licenseNumber', 'plateNumber'],
  };
  
  // Watch form inputs for current step validation
  const currentStepInputs = stepFields[currentStep as keyof typeof stepFields];
  const watchedFields = watch(currentStepInputs);
  
  // Check if current step is valid
  const isCurrentStepValid = async () => {
    const result = await trigger(currentStepInputs);
    return result;
  };
  
  const handleNextStep = async () => {
    const isStepValid = await isCurrentStepValid();
    
    if (isStepValid) {
      if (currentStep < maxSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        handleRegister();
      }
    }
  };
  
  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      
      const formData = getValues();
      
      // Prepare user data for Supabase
      const userData = {
        email: formData.email,
        phone_number: formData.phoneNumber,
        first_name: formData.firstName,
        middle_name: formData.middleName || '',
        last_name: formData.lastName,
        user_type: userType,
        ...(userType === 'driver' && {
          license_number: formData.licenseNumber,
          plate_number: formData.plateNumber,
        }),
      };
      
      const { data, error } = await signUp(formData.email, formData.password, userData);
      
      if (error) {
        Alert.alert('Registration Error', error.message);
        return;
      }
      
      // Navigate to OTP verification
      router.push({
        pathname: '/verify',
        params: { email: formData.email, phoneNumber: formData.phoneNumber },
      });
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  // Get the step title
  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Contact Information';
      case 2:
        return 'Personal Details';
      case 3:
        return 'Driver Information';
      default:
        return 'Create Account';
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subtitle}>
            {userType === 'commuter' 
              ? 'Join as a commuter to book rides' 
              : 'Join as a driver to earn money'}
          </Text>
          
          <View style={styles.stepIndicator}>
            {Array.from({ length: maxSteps }).map((_, index) => (
              <View 
                key={index} 
                style={[
                  styles.stepDot,
                  currentStep >= index + 1 && styles.activeStepDot,
                ]} 
              />
            ))}
          </View>
          
          <Text style={styles.stepTitle}>{getStepTitle()}</Text>
        </View>
        
        <View style={styles.formContainer}>
          {currentStep === 1 && (
            <>
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
                name="phoneNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Phone Number"
                    placeholder="+1234567890"
                    keyboardType="phone-pad"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.phoneNumber?.message}
                    helperText="Include country code (e.g., +1 for US)"
                    leftIcon={<Phone size={20} color={colors.text.secondary} />}
                  />
                )}
              />
            </>
          )}
          
          {currentStep === 2 && (
            <>
              <Controller
                control={control}
                name="firstName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="First Name"
                    placeholder="Enter your first name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.firstName?.message}
                    leftIcon={<User size={20} color={colors.text.secondary} />}
                  />
                )}
              />
              
              <Controller
                control={control}
                name="middleName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Middle Name (Optional)"
                    placeholder="Enter your middle name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.middleName?.message}
                    leftIcon={<User size={20} color={colors.text.secondary} />}
                  />
                )}
              />
              
              <Controller
                control={control}
                name="lastName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Last Name"
                    placeholder="Enter your last name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.lastName?.message}
                    leftIcon={<User size={20} color={colors.text.secondary} />}
                  />
                )}
              />
              
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Password"
                    placeholder="Create a password"
                    secureTextEntry
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    leftIcon={<Lock size={20} color={colors.text.secondary} />}
                  />
                )}
              />
              
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Confirm Password"
                    placeholder="Confirm your password"
                    secureTextEntry
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.confirmPassword?.message}
                    leftIcon={<Lock size={20} color={colors.text.secondary} />}
                  />
                )}
              />
            </>
          )}
          
          {currentStep === 3 && userType === 'driver' && (
            <>
              <Controller
                control={control}
                name="licenseNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Driver's License Number"
                    placeholder="Enter license number"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.licenseNumber?.message}
                    leftIcon={<UserSquare size={20} color={colors.text.secondary} />}
                  />
                )}
              />
              
              <Controller
                control={control}
                name="plateNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Vehicle Plate Number"
                    placeholder="XXX-1234"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.plateNumber?.message}
                    helperText="Format: XXX-1234"
                    leftIcon={<Car size={20} color={colors.text.secondary} />}
                  />
                )}
              />
            </>
          )}
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title={currentStep < maxSteps ? "Next" : "Create Account"}
            onPress={handleNextStep}
            loading={loading}
          />
          
          <Button
            title="Back"
            variant="text"
            onPress={handlePreviousStep}
            disabled={loading}
          />
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Button
            title="Log In"
            variant="text"
            onPress={() => router.push('/login')}
            disabled={loading}
            textStyle={styles.loginButtonText}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  stepIndicator: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray[300],
    marginHorizontal: 4,
  },
  activeStepDot: {
    backgroundColor: colors.primary,
    width: 24,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  formContainer: {
    marginBottom: 24,
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
  loginButtonText: {
    fontWeight: '600',
  },
});