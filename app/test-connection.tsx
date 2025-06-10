import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSocket } from '../lib/socket-context';

export default function TestConnection() {
  const { socket, isConnected, error } = useSocket();
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    if (socket) {
      // Test socket connection
      socket.emit('test', { message: 'Hello from React Native!' });

      // Listen for test response
      socket.on('testResponse', (data) => {
        setMessages(prev => [...prev, `Received: ${data.message}`]);
      });

      // Cleanup
      return () => {
        socket.off('testResponse');
      };
    }
  }, [socket]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Socket.IO Connection Test</Text>
        
        <View style={styles.statusContainer}>
          <Text style={styles.status}>
            Status: {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Error:</Text>
              <Text style={styles.error}>{error}</Text>
            </View>
          )}

          <View style={styles.messagesContainer}>
            <Text style={styles.messagesTitle}>Messages:</Text>
            {messages.map((msg, index) => (
              <Text key={index} style={styles.message}>{msg}</Text>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B4619',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 20,
  },
  statusContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 10,
  },
  status: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 15,
  },
  errorContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 5,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 5,
  },
  error: {
    fontSize: 14,
    color: '#FF6B6B',
  },
  messagesContainer: {
    marginTop: 15,
  },
  messagesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 5,
  },
}); 