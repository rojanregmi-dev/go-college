import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CampusActivity, getActivities } from '../../services/api';

const categoryFilters = ['All', 'Meet', 'Activity'];
const timeFilters = ['Now', 'Today', 'Tonight', 'This Week'];

function isMeet(activity: CampusActivity) {
  return activity.category.toLowerCase() === 'meet';
}

export default function HomeScreen() {
  const router = useRouter();
  const [activities, setActivities] = useState<CampusActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTime, setSelectedTime] = useState('Now');
  const [selectedActivity, setSelectedActivity] = useState<CampusActivity | null>(null);

  useFocusEffect(
    useCallback(() => {
      async function loadActivities() {
        try {
          setLoading(true);
          setErrorMessage('');

          const activityData = await getActivities();

          setActivities(activityData);
        } catch (error) {
          setErrorMessage('Could not load activities around you.');
        } finally {
          setLoading(false);
        }
      }

      loadActivities();
    }, [])
  );

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.brand}>GO</Text>
            <Text style={styles.brandSub}>DISCOVER</Text>
          </View>

          <View style={styles.profileDot}>
            <Text style={styles.profileText}>R</Text>
          </View>
        </View>

        <Text style={styles.title}>
          Got <Text style={styles.titleAccent}>time?</Text>
        </Text>

        <Text style={styles.subtitle}>See what&apos;s happening around you.</Text>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={21} color="#0F4C81" />
            <Text style={styles.searchText}>Search activities, people, or plans...</Text>
          </View>

          <View style={styles.filterButton}>
            <Ionicons name="options-outline" size={22} color="#073B66" />
          </View>
        </View>

        <View style={styles.pillRow}>
          {categoryFilters.map((filter) => {
            const selected = selectedCategory === filter;

            return (
              <Pressable
                key={filter}
                onPress={() => setSelectedCategory(filter)}
                style={[styles.pill, selected && styles.pillSelected]}
              >
                <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.pillRow}>
          {timeFilters.map((filter) => {
            const selected = selectedTime === filter;

            return (
              <Pressable
                key={filter}
                onPress={() => setSelectedTime(filter)}
                style={[styles.pill, selected && styles.pillSelected]}
              >
                <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </View>

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
            <Pressable
              key={activity.id}
              onPress={() => setSelectedActivity(activity)}
              style={styles.card}
            >
              <View style={styles.imagePlaceholder}>
                <Ionicons name="calendar-outline" size={34} color="#FFFFFF" />
              </View>

              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <Text style={styles.category}>{activity.category}</Text>
                  <Ionicons name="bookmark-outline" size={20} color="#0F4C81" />
                </View>

                <Text style={styles.activityTitle}>{activity.title}</Text>

                <View style={styles.metaRow}>
                  <Ionicons name="person-outline" size={15} color="#0F4C81" />
                  <Text style={styles.metaText}>
                    {isMeet(activity) ? 'Posted by' : 'Hosted by'} {activity.group_name}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={15} color="#0F4C81" />
                  <Text style={styles.metaText}>{activity.location}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={15} color="#0F4C81" />
                  <Text style={styles.metaText}>{activity.period}</Text>
                </View>

                <View style={styles.bottomRow}>
                  <Text style={styles.interested}>
                    {activity.interested_count} going
                  </Text>

                  <View style={styles.joinButton}>
                  <Text style={styles.joinButtonText}>View</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal visible={selectedActivity !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.detailSheet}>
            {selectedActivity && (
              <>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailCategory}>{selectedActivity.category}</Text>

                  <Pressable onPress={() => setSelectedActivity(null)}>
                    <Ionicons name="close-circle" size={30} color="#0F4C81" />
                  </Pressable>
                </View>

                <Text style={styles.detailTitle}>{selectedActivity.title}</Text>

                <Text style={styles.detailDescription}>
                  {selectedActivity.group_name} {isMeet(selectedActivity) ? 'posted this meet for' : 'is hosting this activity at'} {selectedActivity.location}. It is planned for {selectedActivity.period}.
                </Text>

                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={18} color="#0F4C81" />
                  <Text style={styles.detailText}>
                    {isMeet(selectedActivity) ? 'Posted by' : 'Hosted by'} {selectedActivity.group_name}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="people-outline" size={18} color="#0F4C81" />
                  <Text style={styles.detailText}>{selectedActivity.interested_count} people going</Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={18} color="#0F4C81" />
                  <Text style={styles.detailText}>{selectedActivity.location}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={18} color="#0F4C81" />
                  <Text style={styles.detailText}>{selectedActivity.period}</Text>
                </View>

                <Pressable style={styles.detailAction}>
                  <Text style={styles.detailActionText}>
                    {isMeet(selectedActivity) ? 'Request to meet' : 'Join activity'}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.chatAction}
                  onPress={() => {
                    setSelectedActivity(null);
                    router.push('/messages');
                  }}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={19} color="#0F4C81" />
                  <Text style={styles.chatActionText}>Open activity chat</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#BFF7FA',
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 56,
    paddingBottom: 32,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  brand: {
    fontSize: 46,
    lineHeight: 44,
    fontWeight: '900',
    color: '#071C4D',
  },

  brandSub: {
    marginTop: -2,
    color: '#071C4D',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.7,
  },

  profileDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },

  profileText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },

  title: {
    marginTop: 18,
    fontSize: 40,
    fontWeight: '900',
    color: '#071C4D',
  },

  titleAccent: {
    color: '#04924A',
  },

  subtitle: {
    marginTop: 2,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '700',
    color: '#071C4D',
  },

  searchRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },

  searchBox: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  searchText: {
    color: '#2B5E91',
    fontSize: 15,
    fontWeight: '600',
  },

  filterButton: {
    width: 58,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  pillRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },

  pill: {
    flex: 1,
    minHeight: 48,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  pillSelected: {
    backgroundColor: '#42F27A',
  },

  pillText: {
    color: '#071C4D',
    fontSize: 14,
    fontWeight: '800',
  },

  pillTextSelected: {
    color: '#001B35',
  },

  statusBox: {
    marginTop: 16,
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    gap: 10,
  },

  statusText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '700',
  },

  errorText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '800',
  },

  feed: {
    marginTop: 16,
    gap: 12,
  },

  card: {
    minHeight: 150,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 10,
    gap: 12,
    shadowColor: '#03606E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },

  imagePlaceholder: {
    width: 108,
    borderRadius: 16,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardBody: {
    flex: 1,
    paddingVertical: 3,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  category: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#64F58C',
    color: '#013B21',
    fontSize: 12,
    fontWeight: '900',
  },

  activityTitle: {
    marginTop: 7,
    color: '#071C4D',
    fontSize: 18,
    fontWeight: '900',
  },

  metaRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  metaText: {
    flex: 1,
    color: '#245B91',
    fontSize: 13,
    fontWeight: '600',
  },

  bottomRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  interested: {
    color: '#04924A',
    fontSize: 14,
    fontWeight: '900',
  },

  joinButton: {
    minWidth: 78,
    borderRadius: 20,
    backgroundColor: '#03A63C',
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },

  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(7, 28, 77, 0.35)',
  },

  detailSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 34,
  },

  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  detailCategory: {
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#64F58C',
    color: '#013B21',
    fontSize: 13,
    fontWeight: '900',
  },

  detailTitle: {
    marginTop: 14,
    color: '#071C4D',
    fontSize: 28,
    fontWeight: '900',
  },

  detailDescription: {
    marginTop: 10,
    color: '#245B91',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },

  detailRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  detailText: {
    flex: 1,
    color: '#071C4D',
    fontSize: 16,
    fontWeight: '700',
  },

  detailAction: {
    marginTop: 24,
    borderRadius: 22,
    backgroundColor: '#03A63C',
    paddingVertical: 16,
    alignItems: 'center',
  },

  detailActionText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },

  chatAction: {
    marginTop: 12,
    borderRadius: 22,
    backgroundColor: '#E0F7FF',
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  chatActionText: {
    color: '#0F4C81',
    fontSize: 16,
    fontWeight: '900',
  },
});
