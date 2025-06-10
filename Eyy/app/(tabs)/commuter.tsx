import { StyleSheet } from 'react-native';
import LoginScreen from '../logincommuter';

export default function CommuterScreen() {
  return <LoginScreen />;
}

// Remove unused styles since we're using LoginScreen's styles
const styles = StyleSheet.create({}); 