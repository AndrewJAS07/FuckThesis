import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function DriverRegisterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    licenseNumber: '',
    vehicleModel: '',
    vehiclePlate: '',
  });

  const handleRegister = async () => {
    try {
      setLoading(true);
      setError(null);

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Create auth user
      const { data: { user }, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (user) {
        // Create driver profile
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: user.id,
              full_name: formData.fullName,
              email: formData.email,
              phone: formData.phone,
              type: 'driver',
              license_number: formData.licenseNumber,
              vehicle_model: formData.vehicleModel,
              vehicle_plate: formData.vehiclePlate,
              status: 'pending', // Drivers need approval
            },
          ]);

        if (profileError) throw profileError;

        router.replace('/login');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Driver Registration</Text>
          <Text style={styles.subtitle}>Sign up as a driver</Text>

          {error && (
            <Text style={styles.error}>{error}</Text>
          )}

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                value={formData.fullName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, fullName: text }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your phone number"
                value={formData.phone}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Driver's License Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your license number"
                value={formData.licenseNumber}
                onChangeText={(text) => setFormData(prev => ({ ...prev, licenseNumber: text }))}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Vehicle Model</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your vehicle model"
                value={formData.vehicleModel}
                onChangeText={(text) => setFormData(prev => ({ ...prev, vehicleModel: text }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Vehicle Plate Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your plate number"
                value={formData.vehiclePlate}
                onChangeText={(text) => setFormData(prev => ({ ...prev, vehiclePlate: text }))}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Create a password"
                value={formData.password}
                onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                secureTextEntry
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData(prev => ({ ...prev, confirmPassword: text }))}
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating Account...' : 'Create Driver Account'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.note}>
              Note: Your account will need to be approved before you can start accepting rides.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#EF4444',
    marginBottom: 20,
  },
  note: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
}); 