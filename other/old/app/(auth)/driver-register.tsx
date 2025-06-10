import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { Car, Upload } from 'lucide-react-native';

export default function DriverRegisterScreen() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    vehicleModel: '',
    licensePlate: '',
    licenseNumber: '',
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80' }}
          style={styles.headerImage}
        />
        <View style={styles.overlay} />
        <Text style={styles.title}>Drive with Us</Text>
        <Text style={styles.subtitle}>Register as a driver</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={formData.fullName}
          onChangeText={(text) => setFormData({ ...formData, fullName: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text })}
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={formData.password}
          onChangeText={(text) => setFormData({ ...formData, password: text })}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
          secureTextEntry
        />

        <Text style={styles.sectionTitle}>Vehicle Information</Text>
        <TextInput
          style={styles.input}
          placeholder="Vehicle Model"
          value={formData.vehicleModel}
          onChangeText={(text) => setFormData({ ...formData, vehicleModel: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="License Plate Number"
          value={formData.licensePlate}
          onChangeText={(text) => setFormData({ ...formData, licensePlate: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Driver's License Number"
          value={formData.licenseNumber}
          onChangeText={(text) => setFormData({ ...formData, licenseNumber: text })}
        />

        <TouchableOpacity style={styles.uploadButton}>
          <Upload size={20} color="#000" />
          <Text style={styles.uploadButtonText}>Upload Driver's License</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Register as Driver</Text>
          <Car size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.links}>
          <Link href="/auth/login" style={styles.link}>
            <Text style={styles.linkText}>Already have an account? Sign In</Text>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 300,
    position: 'relative',
    justifyContent: 'flex-end',
    padding: 20,
  },
  headerImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.8,
  },
  form: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    marginBottom: 15,
    gap: 10,
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#000',
  },
  button: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  links: {
    marginTop: 20,
    alignItems: 'center',
  },
  link: {
    padding: 10,
  },
  linkText: {
    color: '#000',
    fontSize: 16,
  },
});