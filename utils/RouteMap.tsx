import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';

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
}

function RouteMap({ origin, destination }: RouteMapProps) {
  const mapRef = useRef<MapView>(null);
  const [route, setRoute] = useState<any>(null);

  useEffect(() => {
    if (origin && destination) {
      fetchRoute();
      fitMapToMarkers();
    }
  }, [origin, destination]);

  const fetchRoute = async () => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/` +
        `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
        `?overview=full&geometries=geojson`
      );
      const data = await response.json();
      
      if (data.routes && data.routes[0]) {
        setRoute(data.routes[0].geometry.coordinates.map((coord: number[]) => ({
          latitude: coord[1],
          longitude: coord[0],
        })));
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
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
        initialRegion={{
          latitude: origin.latitude,
          longitude: origin.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}>
        <UrlTile 
          urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          zIndex={-1}
        />
        <Marker coordinate={origin}>
          <MapPin color="#10b981" size={24} />
        </Marker>
        
        <Marker coordinate={destination}>
          <MapPin color="#ef4444" size={24} />
        </Marker>
        
        {route && (
          <Polyline
            coordinates={route}
            strokeColor="#000"
            strokeWidth={3}
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