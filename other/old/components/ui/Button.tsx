import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { colors } from '@/constants/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
}: ButtonProps) {
  // Determine button and text styles based on variant
  const buttonStyles: StyleProp<ViewStyle>[] = [styles.button];
  const titleStyles: StyleProp<TextStyle>[] = [styles.buttonText];

  // Apply variant-specific styles
  switch (variant) {
    case 'primary':
      buttonStyles.push(styles.primaryButton);
      titleStyles.push(styles.primaryButtonText);
      break;
    case 'secondary':
      buttonStyles.push(styles.secondaryButton);
      titleStyles.push(styles.secondaryButtonText);
      break;
    case 'outline':
      buttonStyles.push(styles.outlineButton);
      titleStyles.push(styles.outlineButtonText);
      break;
    case 'text':
      buttonStyles.push(styles.textButton);
      titleStyles.push(styles.textButtonText);
      break;
  }

  // Apply disabled styles
  if (disabled || loading) {
    buttonStyles.push(styles.disabledButton);
    titleStyles.push(styles.disabledButtonText);
  }

  // Apply custom styles
  if (style) {
    buttonStyles.push(style);
  }

  if (textStyle) {
    titleStyles.push(textStyle);
  }

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? 'white' : colors.primary} />
      ) : (
        <>
          {leftIcon && <>{leftIcon}</>}
          <Text style={titleStyles}>{title}</Text>
          {rightIcon && <>{rightIcon}</>}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Primary button - filled blue background
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: 'white',
  },
  // Secondary button - filled gray background
  secondaryButton: {
    backgroundColor: colors.background,
  },
  secondaryButtonText: {
    color: colors.primary,
  },
  // Outline button - transparent with border
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  outlineButtonText: {
    color: colors.primary,
  },
  // Text button - no background or border
  textButton: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  textButtonText: {
    color: colors.primary,
  },
  // Disabled state
  disabledButton: {
    opacity: 0.5,
  },
  disabledButtonText: {
    opacity: 0.8,
  },
});