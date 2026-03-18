import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, RefreshControl } from 'react-native';
import { Clock, CheckCircle } from 'lucide-react-native';
import api from '../api/client';

export default function StatusScreen() {
  const [reports, setReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = async () => {
    try {
      const res = await api.get('/api/emergency/sos/history');
      // For demo, just show all history, or filter locally to this device normally by user_id
      setReports(res.data);
    } catch (e) {
      console.warn('Fetch history failed', e);
    }
  };

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 5000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => {
    const isReceived = item.status === 'RECEIVED';
    const isDispatched = item.status === 'DISPATCHED';
    const statusColor = isReceived ? '#ef4444' : isDispatched ? '#f59e0b' : '#10b981';

    return (
      <View style={[styles.card, { borderLeftColor: statusColor }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardId}>SOS ID: #{item.id}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>
        
        <Text style={styles.descList}>{item.description}</Text>
        
        <View style={styles.footer}>
          <Clock color="#94a3b8" size={14} />
          <Text style={styles.timeText}>
            {new Date(item.created_at).toLocaleTimeString()}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={reports}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <CheckCircle color="#10b981" size={48} />
            <Text style={styles.emptyText}>No emergency history</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, borderLeftWidth: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardId: { fontWeight: 'bold', color: '#334155' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  descList: { color: '#475569', fontSize: 13, marginBottom: 12 },
  footer: { flexDirection: 'row', alignItems: 'center' },
  timeText: { marginLeft: 4, fontSize: 12, color: '#94a3b8' },
  empty: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, color: '#64748b', fontSize: 16, fontWeight: '500' }
});
