import Constants from 'expo-constants';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use the user's local IP address as the primary server URL.
// Fallback to Constants.expoConfig?.extra?.serverUrl if the IP is not available (less likely).
const USER_LOCAL_IP = process.env.VITE_PROCESS_URL || 'http://192.168.197.80:3000'; // Replace with your local IP address
const API_URL = USER_LOCAL_IP || Constants.expoConfig?.extra?.serverUrl;

// Ensure API_URL is set, otherwise throw an error
if (!API_URL) {
  throw new Error('API_URL is not defined. Make sure your barckend server IP is correctly set or serverUrl is configured in app.json');
}

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Increased timeout to 30 seconds
});

// Add request interceptor for authentication
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add socket bypass headers for ride creation
    if (config.url?.includes('/api/rides') && config.method === 'post') {
      config.headers['X-Skip-Socket'] = 'true';
      config.headers['X-No-Socket'] = 'true';
      config.headers['X-Bypass-Socket'] = 'true';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    
    // Handle network errors (no response received)
    if (!error.response) {
      console.error('Axios Network Error:', error.message, error.toJSON()); // Log more details
      return Promise.reject(new Error('Network error. Please check your internet connection and make sure the server is running.'));
    }
    
    // Extract error message from response
    const errorMessage = error.response?.data?.error || error.message || 'An error occurred';
    return Promise.reject(new Error(errorMessage));
  }
);

// Types
interface UserData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  role?: 'driver' | 'commuter';
  licenseNumber?: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    phoneNumber: string;
    role: 'driver' | 'commuter';
    licenseNumber?: string;
  };
}

// Auth API endpoints
const authAPI = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/api/auth/login', { email, password });
      if (response.data.token) {
        await AsyncStorage.setItem('token', response.data.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to login');
    }
  },
  register: async (userData: UserData): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/api/auth/register', userData);
      if (response.data.token) {
        await AsyncStorage.setItem('token', response.data.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to register');
    }
  },
  logout: async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } catch (error: any) {
      throw new Error('Failed to logout');
    }
  },
  getCurrentUser: async () => {
    try {
      const response = await api.get('/api/auth/me');
      return response.data;
    } catch (error: any) {
      throw new Error('Failed to get user profile');
    }
  },
};

// User API endpoints
const userAPI = {
  getProfile: async () => {
    const response = await api.get('/api/users/profile');
    return response.data;
  },
  updateProfile: async (data: any) => {
    const response = await api.put('/api/users/profile', data);
    return response.data;
  },
  updateLocation: async (location: { latitude: number; longitude: number }) => {
    const response = await api.post('/api/users/location', location);
    return response.data;
  },
};

// Ride API endpoints
const rideAPI = {
  createRide: async (rideData: {
    pickupLocation: {
      type: string;
      coordinates: [number, number];
      address: string;
    };
    dropoffLocation: {
      type: string;
      coordinates: [number, number];
      address: string;
    };
    fare: number;
    distance: number;
    duration: number;
    paymentMethod: string;
    status: string;
  }) => {
    try {
      // Add necessary fields for driver visibility
      const enhancedRideData = {
        ...rideData,
        status: 'pending',
        isActive: true,
        isVisibleToDrivers: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Add fields that help with driver matching
        pickupTime: new Date().toISOString(),
        estimatedArrivalTime: new Date(Date.now() + rideData.duration * 60 * 1000).toISOString(),
        // Add fields for driver notification
        notifyDrivers: true,
        driverNotificationSent: false
      };

      const response = await api.post('/api/rides', enhancedRideData, {
        headers: {
          'Content-Type': 'application/json',
          'X-Ride-Type': 'commuter-request',
          'X-Notify-Driver': 'true'
        },
        timeout: 10000
      });

      if (!response.data || !response.data.id) {
        throw new Error('Failed to create ride: Invalid response from server');
      }

      return response.data;
    } catch (error: any) {
      console.error('Ride creation error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      // If the first attempt fails, try with minimal data
      try {
        const minimalRideData = {
          ...rideData,
          status: 'pending',
          isActive: true,
          isVisibleToDrivers: true,
          createdAt: new Date().toISOString()
        };

        const retryResponse = await api.post('/api/rides', minimalRideData, {
          headers: {
            'Content-Type': 'application/json',
            'X-Ride-Type': 'commuter-request',
            'X-Minimal-Data': 'true'
          },
          timeout: 10000
        });

        if (!retryResponse.data || !retryResponse.data.id) {
          throw new Error('Failed to create ride with minimal data');
        }

        return retryResponse.data;
      } catch (retryError: any) {
        console.error('Minimal data approach failed:', retryError);
        throw new Error('Failed to create ride. Please try again later.');
      }
    }
  },
  getRides: async () => {
    const response = await api.get('/api/rides');
    return response.data;
  },
  getRideById: async (id: string) => {
    const response = await api.get(`/api/rides/${id}`);
    return response.data;
  },
  updateRideStatus: async (id: string, status: string) => {
    const response = await api.put(`/api/rides/${id}/status`, { status });
    return response.data;
  },
  getActiveRide: async () => {
    const response = await api.get('/api/rides/active');
    return response.data;
  },
};

export { authAPI, userAPI, rideAPI };
export type { UserData, AuthResponse };

export default api; 