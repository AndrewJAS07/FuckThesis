// Google Maps API Configuration
// Replace 'YOUR_GOOGLE_MAPS_API_KEY' with your actual API key

export const GOOGLE_MAPS_API_KEY = 'AIzaSyCv62Aspv5ayOJuzYl4MqhQxjy_ddqb2oc';

// Google Maps API endpoints
export const GOOGLE_MAPS_ENDPOINTS = {
  PLACES_AUTOCOMPLETE: 'https://maps.googleapis.com/maps/api/place/autocomplete/json',
  PLACE_DETAILS: 'https://maps.googleapis.com/maps/api/place/details/json',
  DIRECTIONS: 'https://maps.googleapis.com/maps/api/directions/json',
  GEOCODING: 'https://maps.googleapis.com/maps/api/geocode/json',
  REVERSE_GEOCODING: 'https://maps.googleapis.com/maps/api/geocode/json',
};

// Place types for autocomplete
export const PLACE_TYPES = {
  ADDRESS: 'address',
  ESTABLISHMENT: 'establishment',
  GEOCODE: 'geocode',
  REGION: 'region',
  CITIES: '(cities)',
};

// Travel modes for directions
export const TRAVEL_MODES = {
  DRIVING: 'driving',
  WALKING: 'walking',
  BICYCLING: 'bicycling',
  TRANSIT: 'transit',
};

// Utility function to build Google Maps API URL with parameters
export const buildGoogleMapsUrl = (endpoint: string, params: Record<string, string>) => {
  const url = new URL(endpoint);
  url.searchParams.append('key', GOOGLE_MAPS_API_KEY);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  
  return url.toString();
};

// Utility function to get current location
export const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  });
}; 