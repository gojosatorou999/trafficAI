import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { AlertTriangle, Power } from 'lucide-react-native';
import api from '../api/client';

export default function SOSScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState(null);
  
  // Create a mock static user ID
  const userId = 'USR_' + Math.floor(Math.random() * 9000 + 1000);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
      // Simple mock for demo purposes if simulator doesn't have GPS
      try {
        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      } catch (e) {
        // Fallback to Chennai center for demo
        setLocation({ coords: { latitude: 13.0827, longitude: 80.2707 } });
      }
    })();
  }, []);

  const triggerSOS = () => {
    if (!location) {
      Alert.alert('Error', 'Wait for GPS lock');
      return;
    }
    
    // Start countdown cancel feature
    setCountdown(3);
    
    let currentCount = 3;
    const intervalId = setInterval(async () => {
      currentCount -= 1;
      if (currentCount > 0) {
        setCountdown(currentCount);
      } else {
        clearInterval(intervalId);
        setCountdown(null);
        await fireSOSPayload();
      }
    }, 1000);
    
    // Attach cancel method to state
    global.__cancelSOS = () => {
      clearInterval(intervalId);
      setCountdown(null);
    };
  };
  
  const cancelSOS = () => {
    if (global.__cancelSOS) global.__cancelSOS();
  };

  const fireSOSPayload = async () => {
    setIsSending(true);
    try {
      const payload = {
        user_id: userId,
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        description: 'Mobile App SOS Trigger',
        severity: 'CRITICAL'
      };
      const res = await api.post('/api/emergency/sos', payload);
      Alert.alert(
        'SOS Dispatched', 
        `Help is on the way. ETA: ${res.data.estimated_response_minutes} minutes.\n\nNarrative broadcast sent to nearby vehicles.`,
        [{ text: 'View Status', onPress: () => navigation.navigate('Status') }]
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to dispatch SOS. Please call emergency services directly.');
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AlertTriangle color="#ef4444" size={48} />
        <Text style={styles.title}>Emergency SOS</Text>
        <Text style={styles.subtitle}>Hold button for 3 seconds to dispatch help</Text>
      </View>

      <View style={styles.gpsContainer}>
        {location ? (
          <Text style={styles.gpsText}>
            GPS Lock Acquired: {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
          </Text>
        ) : errorMsg ? (
          <Text style={styles.gpsError}>{errorMsg}</Text>
        ) : (
          <Text style={styles.gpsText}>Scanning for satellites...</Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        {countdown !== null ? (
          <TouchableOpacity 
            style={[styles.sosButton, styles.sosButtonCancel]} 
            onPress={cancelSOS}
          >
            <Text style={styles.countdownText}>{countdown}</Text>
            <Text style={styles.cancelText}>TAP TO CANCEL</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.sosButton, isSending || !location ? styles.sosButtonDisabled : null]} 
            onLongPress={triggerSOS}
            delayLongPress={500}
            disabled={isSending || !location}
          >
            {isSending ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <>
                <Power color="#fff" size={48} />
                <Text style={styles.buttonText}>SOS</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 60 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#0f172a', marginTop: 16 },
  subtitle: { fontSize: 16, color: '#64748b', marginTop: 8, textAlign: 'center' },
  gpsContainer: { padding: 12, backgroundColor: '#e2e8f0', borderRadius: 8, marginBottom: 60, width: '100%', alignItems: 'center' },
  gpsText: { color: '#334155', fontWeight: '500', fontFamily: 'monospace' },
  gpsError: { color: '#ef4444', fontWeight: '600' },
  buttonContainer: { alignItems: 'center', justifyContent: 'center', height: 260 },
  sosButton: { width: 220, height: 220, borderRadius: 110, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 12 },
  sosButtonDisabled: { backgroundColor: '#fca5a5', shadowOpacity: 0 },
  sosButtonCancel: { backgroundColor: '#f59e0b', shadowColor: '#f59e0b' },
  buttonText: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginTop: 8 },
  countdownText: { color: '#fff', fontSize: 80, fontWeight: 'bold' },
  cancelText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 8 },
});
