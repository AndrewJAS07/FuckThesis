import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../lib/AuthContext';

// Import polyfills first
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import '../lib/polyfills';

function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: '#0B4619',
              },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(commuter)" />
            <Stack.Screen name="logincommuter" />
            <Stack.Screen name="loginrider" />
            <Stack.Screen name="signupcommuter" />
            <Stack.Screen name="signuprider" />
            <Stack.Screen name="dashboardrider" />
            <Stack.Screen name="dashboardrcommuter" />
            <Stack.Screen name="historyrider" />
            <Stack.Screen name="historycommuter" />
            <Stack.Screen name="profilerider" />
            <Stack.Screen name="profilecommuter" />
            <Stack.Screen name="locationcommuter" />
            <Stack.Screen name="menucommuter" />
            <Stack.Screen name="menurider" />
            <Stack.Screen name="otpcommuter" />
            <Stack.Screen name="otprider" />
            <Stack.Screen name="waitingcommuter" />
            <Stack.Screen name="forgot-password" />
          </Stack>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AuthProvider>
  );
}

export default RootLayout;
