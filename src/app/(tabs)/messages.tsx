import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const activityThreads = [
  {
    id: 1,
    title: 'Pickup Basketball',
    activity: 'Tonight at Rec Center',
    lastMessage: 'Meet near the front desk when you get there.',
    status: 'Accepted',
  },
  {
    id: 2,
    title: 'Calc Study',
    activity: 'Today at Alkek Library',
    lastMessage: 'Request pending with the host.',
    status: 'Pending',
  },
];

export default function MessagesScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>ACTIVITY CHAT</Text>
      <Text style={styles.title}>Messages</Text>
      <Text style={styles.subtitle}>
        Coordinate inside each meet or activity after a request is accepted.
      </Text>

      <View style={styles.threadList}>
        {activityThreads.map((thread) => (
          <View key={thread.id} style={styles.threadCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="chatbubbles-outline" size={24} color="#FFFFFF" />
            </View>

            <View style={styles.threadBody}>
              <View style={styles.threadTopRow}>
                <Text style={styles.threadTitle}>{thread.title}</Text>
                <Text
                  style={[
                    styles.statusPill,
                    thread.status === 'Accepted' && styles.statusAccepted,
                  ]}
                >
                  {thread.status}
                </Text>
              </View>

              <Text style={styles.activityText}>{thread.activity}</Text>
              <Text style={styles.messageText}>{thread.lastMessage}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#BFF7FA',
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 72,
    paddingBottom: 32,
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    color: '#04924A',
    letterSpacing: 1.5,
  },

  title: {
    marginTop: 8,
    color: '#071C4D',
    fontSize: 40,
    fontWeight: '900',
  },

  subtitle: {
    marginTop: 8,
    color: '#071C4D',
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
  },

  threadList: {
    marginTop: 24,
    gap: 14,
  },

  threadCard: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#03606E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },

  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#03A63C',
    alignItems: 'center',
    justifyContent: 'center',
  },

  threadBody: {
    flex: 1,
  },

  threadTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  threadTitle: {
    flex: 1,
    color: '#071C4D',
    fontSize: 19,
    fontWeight: '900',
  },

  statusPill: {
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E0F2FE',
    color: '#0F4C81',
    fontSize: 11,
    fontWeight: '900',
  },

  statusAccepted: {
    backgroundColor: '#64F58C',
    color: '#013B21',
  },

  activityText: {
    marginTop: 4,
    color: '#245B91',
    fontSize: 14,
    fontWeight: '700',
  },

  messageText: {
    marginTop: 8,
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
});
