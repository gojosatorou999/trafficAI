import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import api from '../api/client';

export default function MapScreen() {
  const [location, setLocation] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Default to Chennai
  const [region, setRegion] = useState({
    latitude: 13.0827,
    longitude: 80.2707,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    fetchIncidents();
    
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
        setRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
    })();
    
    // Poll incidents every 5 seconds
    const interval = setInterval(fetchIncidents, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await api.get('/api/highway/incidents');
      setIncidents(res.data);
    } catch (e) {
      console.warn('Map: Failed to fetch incidents', e);
    } finally {
      setLoading(false);
    }
  };

  const getMarkerPinColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'purple';
      case 'HIGH': return 'red';
      case 'MEDIUM': return 'orange';
      default: return 'yellow';
    }
  };

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map} 
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {incidents.map((inc) => (
          <Marker
            key={inc.id}
            coordinate={{ latitude: inc.lat, longitude: inc.lng }}
            title={`${inc.type} (${inc.severity})`}
            description={inc.description}
            pinColor={getMarkerPinColor(inc.severity)}
          />
        ))}
        {location && (
          <Marker
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            title="You"
            pinColor="blue"
          />
        )}
      </MapView>

      {/* Floating Header */}
      <View style={styles.floatingHeader}>
        <Text style={styles.headerText}>Nearby Safety Hazards</Text>
        {loading && <ActivityIndicator size="small" color="#fff" style={{marginLeft: 10}} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  floatingHeader: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: { color: '#fff', fontWeight: 'bold' }
});
