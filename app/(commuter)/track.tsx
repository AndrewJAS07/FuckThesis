// import React, { useEffect, useState } from 'react';
// import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
// import { useLocalSearchParams, useRouter } from 'expo-router';
// import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
// import { Ionicons } from '@expo/vector-icons';
// import { rideAPI } from '../../lib/api';

// const RideScreen: React.FC = () => {
//   const { rideId } = useLocalSearchParams();
//   const router = useRouter();

//   const [ride, setRide] = useState(null);
//   const [region, setRegion] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     if (!rideId) {
//       Alert.alert('Error', 'No ride ID provided.');
//       return;
//     }

//     const fetchRide = async () => {
//       try {
//         const rideData = await rideAPI.getRideById(rideId as string);
//         setRide(rideData);

//         const pickup = rideData.pickupLocation.coordinates;
//         const dropoff = rideData.dropoffLocation.coordinates;

//         setRegion({
//           latitude: (pickup[1] + dropoff[1]) / 2,
//           longitude: (pickup[0] + dropoff[0]) / 2,
//           latitudeDelta: 0.01,
//           longitudeDelta: 0.01,
//         });
//       } catch (err) {
//         console.error(err);
//         Alert.alert('Error', 'Failed to fetch ride information.');
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchRide();
//   }, [rideId]);

//   if (isLoading || !ride || !region) {
//     return (
//       <SafeAreaView style={styles.centered}>
//         <ActivityIndicator size="large" color="#0d4217" />
//       </SafeAreaView>
//     );
//   }

//   const pickup = ride.pickupLocation.coordinates;
//   const dropoff = ride.dropoffLocation.coordinates;

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.headerText}>Ride in Progress</Text>
//       </View>

//       <MapView
//         provider={PROVIDER_GOOGLE}
//         style={styles.map}
//         region={region}
//         showsUserLocation
//       >
//         <Marker
//           coordinate={{ latitude: pickup[1], longitude: pickup[0] }}
//           title="Pickup"
//         >
//           <Ionicons name="navigate" size={30} color="#0d4217" />
//         </Marker>

//         <Marker
//           coordinate={{ latitude: dropoff[1], longitude: dropoff[0] }}
//           title="Destination"
//         >
//           <Ionicons name="flag" size={30} color="red" />
//         </Marker>
//       </MapView>

//       <View style={styles.bottomPanel}>
//         <Text style={styles.label}>Driver: {ride.driver?.name || 'Assigning...'}</Text>
//         <Text style={styles.label}>Fare: ₱{ride.fare.toFixed(2)}</Text>
//         <Text style={styles.label}>Status: {ride.status}</Text>
//       </View>
//     </SafeAreaView>
//   );
// };

// export default RideScreen;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   centered: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   header: {
//     backgroundColor: '#0d4217',
//     padding: 16,
//   },
//   headerText: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   map: {
//     flex: 1,
//   },
//   bottomPanel: {
//     padding: 16,
//     backgroundColor: '#fff',
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     shadowColor: '#000',
//     shadowOpacity: 0.1,
//     shadowRadius: 10,
//     elevation: 10,
//   },
//   label: {
//     fontSize: 16,
//     marginBottom: 8,
//   },
// });

import React from 'react'

export default function track() {
  return (
    <div>this is track</div>
  )
}
