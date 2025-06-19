import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { GOOGLE_MAPS_ENDPOINTS, buildGoogleMapsUrl, TRAVEL_MODES } from '../lib/google-maps-config';

interface RouteMapProps {
  origin: {
    latitude: number;
    longitude: number;
    address: string;
  };
  destination: {
    latitude: number;
    longitude: number;
    address: string;
  };
  travelMode?: string;
  showRouteInfo?: boolean;
  onRouteReceived?: (route: any) => void;
}

function RouteMap({ 
  origin, 
  destination, 
  travelMode = TRAVEL_MODES.DRIVING,
  showRouteInfo = true,
  onRouteReceived 
}: RouteMapProps) {
  const mapRef = useRef<MapView>(null);
  const [route, setRoute] = useState<any>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);

  useEffect(() => {
    if (origin && destination) {
      fetchGoogleRoute();
      fitMapToMarkers();
    }
  }, [origin, destination, travelMode]);

  const fetchGoogleRoute = async () => {
    try {
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destinationStr = `${destination.latitude},${destination.longitude}`;

      const params = {
        origin: originStr,
        destination: destinationStr,
        mode: travelMode,
        alternatives: 'false',
        units: 'metric',
      };

      const url = buildGoogleMapsUrl(GOOGLE_MAPS_ENDPOINTS.DIRECTIONS, params);
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes && data.routes[0]) {
        const routeData = data.routes[0];
        const coordinates = decodePolyline(routeData.overview_polyline.points);
        
        setRoute(routeData);
        setRouteCoordinates(coordinates);
        onRouteReceived?.(routeData);
      } else {
        // Fallback to OSRM if Google fails
        fetchOSRMRoute();
      }
    } catch (error) {
      console.error('Error fetching Google route:', error);
      // Fallback to OSRM
      fetchOSRMRoute();
    }
  };

  const fetchOSRMRoute = async () => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/` +
        `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
        `?overview=full&geometries=geojson`
      );
      const data = await response.json();
      
      if (data.routes && data.routes[0]) {
        const coordinates = data.routes[0].geometry.coordinates.map((coord: number[]) => ({
          latitude: coord[1],
          longitude: coord[0],
        }));
        setRouteCoordinates(coordinates);
        onRouteReceived?.(data.routes[0]);
      }
    } catch (error) {
      console.error('Error fetching OSRM route:', error);
    }
  };

  const decodePolyline = (encoded: string) => {
    const poly = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let shift = 0, result = 0;

      do {
        let b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (result >= 0x20);

      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        let b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (result >= 0x20);

      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push({
        latitude: lat / 1E5,
        longitude: lng / 1E5,
      });
    }

    return poly;
  };

  const fitMapToMarkers = () => {
    if (mapRef.current) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: origin.latitude, longitude: origin.longitude },
          { latitude: destination.latitude, longitude: destination.longitude }
        ],
        {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        }
      );
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: origin.latitude,
          longitude: origin.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        showsTraffic={true}
        showsBuildings={true}
        showsIndoors={true}
        mapType="standard"
        >
        <Marker 
          coordinate={origin}
          title="Origin"
          description={origin.address}
          pinColor="#10b981"
        />
        
        <Marker 
          coordinate={destination}
          title="Destination"
          description={destination.address}
          pinColor="#ef4444"
        />
        
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#007AFF"
            strokeWidth={4}
            lineDashPattern={[1]}
            geodesic={true}
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  }
});

export { RouteMap };