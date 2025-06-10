import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Animated,
  TextInputProps,
  TouchableOpacity,
  KeyboardTypeOptions,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors } from '@/constants/colors';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  secureTextEntry,
  keyboardType = 'default',
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);
  
  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const hasError = !!error;

  // Determine container styles based on focus and error states
  const containerStyle = [
    styles.container,
    isFocused && styles.focusedContainer,
    hasError && styles.errorContainer,
  ];

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      
      <View style={containerStyle}>
        {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
        
        <TextInput
          style={styles.input}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          placeholderTextColor={colors.text.secondary}
          {...props}
        />
        
        {secureTextEntry ? (
          <TouchableOpacity onPress={togglePasswordVisibility} style={styles.iconContainer}>
            {isPasswordVisible ? (
              <EyeOff size={20} color={colors.text.secondary} />
            ) : (
              <Eye size={20} color={colors.text.secondary} />
            )}
          </TouchableOpacity>
        ) : (
          rightIcon && <View style={styles.iconContainer}>{rightIcon}</View>
        )}
      </View>
      
      {(error || helperText) && (
        <Text style={[styles.helperText, hasError && styles.errorText]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    height: 56,
  },
  focusedContainer: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  errorContainer: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 16,
    paddingVertical: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  iconContainer: {
    marginLeft: 8,
  },
  helperText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 8,
  },
  errorText: {
    color: colors.error,
  },
});