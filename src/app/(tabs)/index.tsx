import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CampusActivity, getActivities } from '../../services/api';

export default function HomeScreen() {
  const [activities, setActivities] = useState<CampusActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useFocusEffect(
    useCallback(() => {
      async function loadActivities() {
        try {
          setLoading(true);
          setErrorMessage('');
          const activityData = await getActivities();
          setActivities(activityData);
        } catch (error) {
          setErrorMessage('Could not load campus activities.');
        } finally {
          setLoading(false);
        }
      }

      loadActivities();
    }, [])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>GO COLLEGE</Text>
      <Text style={styles.title}>Campus feed</Text>
      <Text style={styles.subtitle}>
        See what people are doing, when they are free, and where you can join in.
      </Text>

      {loading && (
        <View style={styles.statusBox}>
          <ActivityIndicator color="#16A34A" />
          <Text style={styles.statusText}>Loading activities...</Text>
        </View>
      )}

      {errorMessage && (
        <View style={styles.statusBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <View style={styles.feed}>
        {activities.map((activity) => (
          <View key={activity.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.category}>{activity.category}</Text>
              <Text style={styles.period}>{activity.period}</Text>
            </View>
            <Text style={styles.activityTitle}>{activity.title}</Text>
            <Text style={styles.groupName}>{activity.group_name}</Text>
            <Text style={styles.location}>{activity.location}</Text>
            <Text style={styles.interested}>
              {activity.interested_count} people interested
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAF8' },
  content: { paddingHorizontal: 24, paddingTop: 72, paddingBottom: 32 },
  eyebrow: { fontSize: 12, fontWeight: '800', color: '#16A34A', letterSpacing: 1.5 },
  title: { marginTop: 8, fontSize: 34, fontWeight: '900', color: '#0F172A' },
  subtitle: { marginTop: 12, fontSize: 16, lineHeight: 23, color: '#64748B' },
  statusBox: { marginTop: 28, padding: 18, backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 },
  statusText: { color: '#475569', fontSize: 15, fontWeight: '600' },
  errorText: { color: '#DC2626', fontSize: 15, fontWeight: '700' },
  feed: { marginTop: 28, gap: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', padding: 18 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  category: { color: '#16A34A', fontSize: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  period: { color: '#2563EB', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  activityTitle: { marginTop: 12, fontSize: 22, fontWeight: '900', color: '#0F172A' },
  groupName: { marginTop: 6, fontSize: 15, fontWeight: '700', color: '#475569' },
  location: { marginTop: 12, fontSize: 15, color: '#64748B' },
  interested: { marginTop: 14, fontSize: 15, fontWeight: '800', color: '#16A34A' },
});
