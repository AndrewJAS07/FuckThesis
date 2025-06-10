import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { UserType } from '@/context/AuthContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export default function UserTypeScreen() {
  const { setUserType } = useAuth();
  const [selectedType, setSelectedType] = useState<UserType>(null);
  
  // Animation values
  const scale = useSharedValue(1);
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
  
  const handleSelect = (type: UserType) => {
    setSelectedType(type);
    scale.value = withTiming(0.98, { duration: 100 });
    setTimeout(() => {
      scale.value = withTiming(1, { duration: 200 });
    }, 100);
  };
  
  const handleContinue = () => {
    if (selectedType) {
      setUserType(selectedType);
      router.push('/register');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <Animated.View style={[styles.content, animatedStyle]}>
        <Text style={styles.title}>I want to use RideX as</Text>
        
        <View style={styles.optionsContainer}>
          <Pressable
            onPress={() => handleSelect('commuter')}
            style={({ pressed }) => [
              styles.option,
              selectedType === 'commuter' && styles.selectedOption,
              pressed && styles.pressedOption,
            ]}
          >
            <Image
              source={{ uri: 'https://images.pexels.com/photos/7319326/pexels-photo-7319326.jpeg?auto=compress&cs=tinysrgb&w=600' }}
              style={styles.optionImage}
            />
            <View style={styles.optionOverlay}>
              {selectedType === 'commuter' && (
                <View style={styles.checkmarkContainer}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
              )}
            </View>
            <Text style={styles.optionTitle}>Commuter</Text>
            <Text style={styles.optionDescription}>
              Book rides to your destination
            </Text>
          </Pressable>
          
          <Pressable
            onPress={() => handleSelect('driver')}
            style={({ pressed }) => [
              styles.option,
              selectedType === 'driver' && styles.selectedOption,
              pressed && styles.pressedOption,
            ]}
          >
            <Image
              source={{ uri: 'https://images.pexels.com/photos/13861/IMG_3496bfree.jpg?auto=compress&cs=tinysrgb&w=600' }}
              style={styles.optionImage}
            />
            <View style={styles.optionOverlay}>
              {selectedType === 'driver' && (
                <View style={styles.checkmarkContainer}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
              )}
            </View>
            <Text style={styles.optionTitle}>Driver</Text>
            <Text style={styles.optionDescription}>
              Earn by giving rides to others
            </Text>
          </Pressable>
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Continue"
            onPress={handleContinue}
            disabled={!selectedType}
          />
          
          <Pressable 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
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
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 32,
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  option: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: 'center',
    backgroundColor: colors.background,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedOption: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  pressedOption: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  optionImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  optionOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: 'white',
    fontWeight: 'bold',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  backButton: {
    marginTop: 16,
    padding: 8,
  },
  backButtonText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
});