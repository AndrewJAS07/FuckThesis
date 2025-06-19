# Google Maps Integration Setup Guide

This guide will help you set up Google Maps API for autocomplete, routes, and navigation in your EyyTrike React Native app.

## Prerequisites

- Google Cloud Console account
- Google Maps API enabled
- Valid API key with appropriate permissions

## Step 1: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Maps SDK for Android**
   - **Maps SDK for iOS**
   - **Places API**
   - **Directions API**
   - **Geocoding API**

## Step 2: Create API Keys

1. In Google Cloud Console, go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Create separate API keys for:
   - **Android**: For Android app
   - **iOS**: For iOS app
   - **Web**: For web app (if needed)

## Step 3: Configure API Key Restrictions

For each API key, set up restrictions:

### Android API Key
- **Application restrictions**: Android apps
- **Package name**: `com.anonymous.eyytrike`
- **SHA-1 certificate fingerprint**: Your app's SHA-1 fingerprint

### iOS API Key
- **Application restrictions**: iOS apps
- **Bundle ID**: `com.anonymous.eyytrike`

### API restrictions
- **API restrictions**: Restrict key to:
  - Maps SDK for Android/iOS
  - Places API
  - Directions API
  - Geocoding API

## Step 4: Update Configuration Files

### 1. Update `lib/google-maps-config.ts`

Replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual API key:

```typescript
export const GOOGLE_MAPS_API_KEY = 'your_actual_api_key_here';
```

### 2. Update `app.json`

Replace the placeholder API keys:

```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "your_android_api_key_here"
        }
      }
    },
    "extra": {
      "googleMapsApiKey": "your_web_api_key_here"
    }
  }
}
```

### 3. Update iOS Configuration (if needed)

For iOS, you may need to add the API key to your `Info.plist`:

```xml
<key>GMSApiKey</key>
<string>your_ios_api_key_here</string>
```

## Step 5: Install Dependencies

The following packages are already installed:

```bash
npm install react-native-google-places-autocomplete @react-native-community/geolocation
```

## Step 6: Usage Examples

### Basic Location Picker

```typescript
import LocationPicker from './utils/LocationPicker';

const MyComponent = () => {
  const [location, setLocation] = useState(null);

  return (
    <LocationPicker
      value={location}
      onLocationSelect={setLocation}
      placeholder="Select location..."
    />
  );
};
```

### Google Places Autocomplete

```typescript
import GooglePlacesAutocomplete from './utils/GooglePlacesAutocomplete';

const MyComponent = () => {
  const handlePlaceSelect = (place, details) => {
    console.log('Selected place:', place);
    console.log('Place details:', details);
  };

  return (
    <GooglePlacesAutocomplete
      placeholder="Search for places..."
      onPlaceSelected={handlePlaceSelect}
    />
  );
};
```

### Route Map with Directions

```typescript
import { RouteMap } from './utils/RouteMap';
import GoogleDirections from './utils/GoogleDirections';

const MyComponent = () => {
  const origin = { latitude: 13.7563, longitude: 121.0583, address: 'Manila' };
  const destination = { latitude: 14.5995, longitude: 120.9842, address: 'Makati' };

  return (
    <View>
      <RouteMap
        origin={origin}
        destination={destination}
        travelMode="driving"
        onRouteReceived={(route) => console.log('Route:', route)}
      />
      
      <GoogleDirections
        origin={origin}
        destination={destination}
        travelMode="driving"
        onNavigate={() => console.log('Navigate')}
      />
    </View>
  );
};
```

## Step 7: Complete Example

See `utils/GoogleMapsExample.tsx` for a complete example that demonstrates all features working together.

## Step 8: Testing

1. Run your app: `npm start`
2. Test location picker functionality
3. Test autocomplete search
4. Test route calculation
5. Test navigation features

## Troubleshooting

### Common Issues

1. **"API key not valid" error**
   - Check if API key is correctly set
   - Verify API restrictions are properly configured
   - Ensure the correct APIs are enabled

2. **"This API project is not authorized" error**
   - Enable the required APIs in Google Cloud Console
   - Check billing is enabled for the project

3. **Location permissions not working**
   - Ensure location permissions are properly configured in `app.json`
   - Check if location services are enabled on device

4. **Maps not loading**
   - Verify Google Maps API key is set correctly
   - Check network connectivity
   - Ensure Google Play Services are installed (Android)

### Debug Tips

1. Check console logs for API errors
2. Verify API key restrictions match your app
3. Test with a simple API call first
4. Use Google Cloud Console's API dashboard to monitor usage

## Security Best Practices

1. **Never commit API keys to version control**
   - Use environment variables
   - Use secure key management systems
   - Consider using API key restrictions

2. **Set up proper API restrictions**
   - Restrict by application (Android/iOS)
   - Restrict by API usage
   - Monitor API usage regularly

3. **Implement rate limiting**
   - Add delays between API calls
   - Cache results when possible
   - Handle API errors gracefully

## Cost Considerations

Google Maps API has usage-based pricing:
- **Places API**: $17 per 1000 requests
- **Directions API**: $5 per 1000 requests
- **Geocoding API**: $5 per 1000 requests
- **Maps SDK**: Free for basic usage

Monitor your usage in Google Cloud Console to avoid unexpected charges.

## Support

For additional help:
- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [React Native Maps Documentation](https://github.com/react-native-maps/react-native-maps)
- [Expo Location Documentation](https://docs.expo.dev/versions/latest/sdk/location/) 