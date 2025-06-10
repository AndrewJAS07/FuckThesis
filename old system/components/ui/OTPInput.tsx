import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Keyboard,
  Pressable,
  Text,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/constants/colors';

interface OTPInputProps {
  codeLength?: number;
  onCodeFilled: (code: string) => void;
  error?: string;
}

export function OTPInput({
  codeLength = 6,
  onCodeFilled,
  error,
}: OTPInputProps) {
  const [code, setCode] = useState<string[]>(Array(codeLength).fill(''));
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const containerRef = useRef<View>(null);
  const [isFocused, setIsFocused] = useState<boolean[]>(Array(codeLength).fill(false));
  
  // Animation values for shake effect on error
  const offsetX = useSharedValue(0);
  
  useEffect(() => {
    if (error) {
      shakeAnimation();
    }
  }, [error]);
  
  const shakeAnimation = () => {
    // A series of small, quick movements left and right
    const iterations = 6;
    const distance = 10;
    
    Array(iterations).fill(0).forEach((_, i) => {
      const toValue = i % 2 === 0 ? distance : -distance;
      const delay = i * 50;
      
      setTimeout(() => {
        offsetX.value = withTiming(toValue, { duration: 50 });
      }, delay);
    });
    
    // Return to center position
    setTimeout(() => {
      offsetX.value = withTiming(0, { duration: 50 });
    }, iterations * 50);
  };
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: offsetX.value }],
    };
  });

  const handleCodeChange = (text: string, index: number) => {
    // Only accept single digits
    if (!/^\d*$/.test(text)) return;
    
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    
    // Auto-advance to next input
    if (text && index < codeLength - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Check if code is complete
    const filledCode = newCode.join('');
    if (filledCode.length === codeLength) {
      onCodeFilled(filledCode);
      Keyboard.dismiss();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace navigation
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    const newFocusState = [...isFocused];
    newFocusState[index] = true;
    setIsFocused(newFocusState);
  };

  const handleBlur = (index: number) => {
    const newFocusState = [...isFocused];
    newFocusState[index] = false;
    setIsFocused(newFocusState);
  };

  const focusFirstEmptyInput = () => {
    const firstEmptyIndex = code.findIndex(digit => !digit);
    const indexToFocus = firstEmptyIndex !== -1 ? firstEmptyIndex : codeLength - 1;
    inputRefs.current[indexToFocus]?.focus();
  };

  return (
    <View style={styles.wrapper}>
      <Pressable onPress={focusFirstEmptyInput}>
        <Animated.View 
          style={[styles.container, animatedStyle]} 
          ref={containerRef}
        >
          {Array(codeLength).fill(0).map((_, index) => {
            const isInputFilled = !!code[index];
            const isInputFocused = isFocused[index];
            
            return (
              <View 
                key={index}
                style={[
                  styles.inputContainer,
                  isInputFilled && styles.filledInput,
                  isInputFocused && styles.focusedInput,
                  error && styles.errorInput,
                ]}
              >
                <TextInput
                  ref={ref => (inputRefs.current[index] = ref)}
                  style={styles.input}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={code[index]}
                  onChangeText={text => handleCodeChange(text, index)}
                  onKeyPress={e => handleKeyPress(e, index)}
                  onFocus={() => handleFocus(index)}
                  onBlur={() => handleBlur(index)}
                  selectionColor={colors.primary}
                />
              </View>
            );
          })}
        </Animated.View>
      </Pressable>
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 24,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 360,
  },
  inputContainer: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  input: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.text.primary,
    width: '100%',
    height: '100%',
  },
  filledInput: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  focusedInput: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  errorInput: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    marginTop: 8,
    fontSize: 14,
  },
});