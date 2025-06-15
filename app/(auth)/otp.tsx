import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';
import { useRouter } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import { useState, useRef, useEffect } from 'react';

export default function OtpCommuterScreen() {
  const router = useRouter();
  const [otp, setOtp] = useState(['', '', '', '']);
  const [singleOtpInput, setSingleOtpInput] = useState('');
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    // When singleOtpInput changes, distribute its digits to the OTP array
    if (singleOtpInput) {
      const digits = singleOtpInput.split('').slice(0, 4);
      const newOtp = [...otp];
      digits.forEach((digit, index) => {
        if (index < 4) newOtp[index] = digit;
      });
      setOtp(newOtp);

      // Focus the appropriate input
      const focusIndex = Math.min(digits.length, 3);
      inputRefs.current[focusIndex]?.focus();
    }
  }, [singleOtpInput]);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // If pasting or entering multiple digits
      setSingleOtpInput(value);
    } else {
      // Single digit input
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Move to next input if value is entered
      if (value && index < 3 && inputRefs.current[index + 1]) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {/* Close Button */}
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={() => router.back()}
      >
        <AntDesign name="close" size={24} color="#000000" />
      </TouchableOpacity>

      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/images/eyytrike2.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      {/* Form Wrapper */}
      <View style={styles.formWrapper}>
        {/* OTP Section */}
        <View style={styles.otpContainer}>
          <Text style={styles.title}>Otp Verification</Text>
          <Text style={styles.subtitle}>Check your sms for the otp!</Text>
          
          {/* Hidden input for continuous typing */}
          <TextInput
            style={styles.hiddenInput}
            value={singleOtpInput}
            onChangeText={setSingleOtpInput}
            keyboardType="number-pad"
            maxLength={4}
          />
          
          {/* OTP Input Fields */}
          <View style={styles.otpInputContainer}>
            {[0, 1, 2, 3].map((index) => (
              <TextInput
                key={index}
                ref={(ref) => inputRefs.current[index] = ref}
                style={styles.otpInput}
                maxLength={1}
                keyboardType="number-pad"
                value={otp[index]}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity 
            style={styles.verifyButton}
            onPress={() => router.push('/dashboardcommuter')}
          >
            <Text style={styles.verifyButtonText}>Verify</Text>
          </TouchableOpacity>

          {/* Resend Link */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Not Received yet? </Text>
            <TouchableOpacity>
              <Text style={styles.resendLink}>Resend it</Text>
            </TouchableOpacity>
          </View>
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
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginTop: -150,
  },
  logoImage: {
    width: 400,
    height: 160,
  },
  formWrapper: {
    backgroundColor: '#0d4217',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  otpContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 30,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  otpInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 30,
  },
  otpInput: {
    width: 50,
    height: 50,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 24,
    color: '#0d4217',
  },
  verifyButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#0d4217',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendText: {
    color: '#ffffff',
    fontSize: 13,
  },
  resendLink: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
}); 