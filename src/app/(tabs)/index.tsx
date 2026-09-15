import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  API_BASE_URL,
  CampusActivity,
  JoinRequest,
  cancelJoinRequest,
  createJoinRequest,
  deleteActivity,
  getActivities,
  getIncomingJoinRequests,
  getOutgoingJoinRequests,
  getProfile,
  updateJoinRequestStatus,
  UserProfile,
} from '../../services/api';
import { distanceMiles, GeoPoint, matchesLocationFilter } from '../../lib/location';
import { requestUserLocation } from '../../services/location';

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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [outgoingRequests, setOutgoingRequests] = useState<JoinRequest[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<JoinRequest[]>([]);
  const [savingRequestId, setSavingRequestId] = useState<number | null>(null);
  const [origin, setOrigin] = useState<GeoPoint | null>(null);
  const [nearby, setNearby] = useState(false);
  const [radius, setRadius] = useState('10');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const radiusMiles = Number(radius);
  const validRadius = Number.isFinite(radiusMiles) && radiusMiles >= 0.1 && radiusMiles <= 500;

  async function loadHomeData() {
    try {
      setLoading(true);
      setErrorMessage('');

      const profileData = await getProfile();
      const [activityData, outgoingData, incomingData] = await Promise.all([
        getActivities(),
        getOutgoingJoinRequests(profileData.user_code),
        getIncomingJoinRequests(profileData.user_code),
      ]);

      setActivities(activityData);
      setProfile(profileData);
      setOutgoingRequests(outgoingData);
      setIncomingRequests(incomingData);
    } catch (error) {
      setErrorMessage('Could not load activities around you.');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
    }, [])
  );

  async function handleNearby(enabled: boolean) {
    if (locating) return;
    setSelectedActivity(null);
    setLocationError('');
    if (!enabled) {
      setNearby(false);
      return;
    }
    setLocating(true);
    try {
      const position = await requestUserLocation();
      setOrigin(position);
      setNearby(true);
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  }

  function isCreator(activity: CampusActivity) {
    return profile?.user_code === activity.creator_code;
  }

  function requestForActivity(activityId: number) {
    return outgoingRequests.find((request) => request.activity_id === activityId);
  }

  function pendingRequestsForActivity(activityId: number) {
    return incomingRequests.filter(
      (request) => request.activity_id === activityId && request.status === 'pending'
    );
  }

  function isFull(activity: CampusActivity) {
    return activity.spots_left === 0;
  }

  function actionLabel(activity: CampusActivity) {
    if (isCreator(activity)) {
      const pendingCount = pendingRequestsForActivity(activity.id).length;
      return pendingCount ? `${pendingCount} request${pendingCount === 1 ? '' : 's'}` : 'No requests';
    }

    const request = requestForActivity(activity.id);

    if (request?.status === 'pending') {
      return 'Cancel request';
    }

    if (request?.status === 'accepted') {
      return 'Open messages';
    }

    if (request?.status === 'denied') {
      return 'Denied';
    }

    if (isFull(activity)) {
      return 'Full';
    }

    return isMeet(activity) ? 'Request to meet' : 'Join activity';
  }

  async function handlePrimaryAction(activity: CampusActivity) {
    if (!profile) {
      Alert.alert('Login needed', 'Login before joining a plan.');
      return;
    }

    if (isCreator(activity)) {
      return;
    }

    const existingRequest = requestForActivity(activity.id);

    if (existingRequest?.status === 'pending') {
      try {
        setSavingRequestId(activity.id);
        await cancelJoinRequest(existingRequest.id, profile.user_code);
        setOutgoingRequests((current) =>
          current.filter((request) => request.id !== existingRequest.id)
        );
        Alert.alert('Request cancelled', 'Your request was removed.');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not cancel request.';
        Alert.alert('Cancel failed', message);
      } finally {
        setSavingRequestId(null);
      }

      return;
    }

    if (existingRequest?.status === 'accepted') {
      setSelectedActivity(null);
      router.push('/messages');
      return;
    }

    if (existingRequest) {
      return;
    }

    if (isFull(activity)) {
      Alert.alert('Full', 'This plan is already full.');
      return;
    }

    try {
      setSavingRequestId(activity.id);

      const request = await createJoinRequest(activity.id, profile.user_code);
      setOutgoingRequests((current) => [...current, request]);
      Alert.alert('Request sent', 'The host can accept or deny your request.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send request.';
      Alert.alert('Request failed', message);
    } finally {
      setSavingRequestId(null);
    }
  }

  async function handleUpdateRequest(requestId: number, status: 'accepted' | 'denied') {
    if (!profile) {
      return;
    }

    try {
      setSavingRequestId(requestId);
      const updatedRequest = await updateJoinRequestStatus(requestId, status, profile.user_code);

      setIncomingRequests((current) =>
        current.map((request) => (request.id === requestId ? updatedRequest : request))
      );

      const activityData = await getActivities();
      setActivities(activityData);

      const updatedActivity = activityData.find(
        (activity) => activity.id === updatedRequest.activity_id
      );

      if (updatedActivity && isFull(updatedActivity)) {
        setSelectedActivity(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update request.';
      Alert.alert('Request failed', message);
    } finally {
      setSavingRequestId(null);
    }
  }

  async function handleDeleteActivity(activity: CampusActivity) {
    if (!profile || !isCreator(activity)) {
      return;
    }

    try {
      setSavingRequestId(activity.id);
      await deleteActivity(activity.id, profile.user_code);
      setActivities((current) => current.filter((item) => item.id !== activity.id));
      setIncomingRequests((current) =>
        current.filter((request) => request.activity_id !== activity.id)
      );
      setSelectedActivity(null);
      Alert.alert('Post deleted', 'Your post was removed from Discover.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not delete post.';
      Alert.alert('Delete failed', message);
    } finally {
      setSavingRequestId(null);
    }
  }

  const visibleActivities = activities.filter((activity) => {
    const matchesCategory =
      selectedCategory === 'All' || activity.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesRange = !nearby ||
      (validRadius && matchesLocationFilter(activity, origin, radiusMiles));

    return matchesCategory && !isFull(activity) && matchesRange;
  });

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.topRow}>
          <View>
            <Text style={styles.brand}>GO</Text>
            <Text style={styles.brandSub}>DISCOVER</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            hitSlop={8}
            onPress={() => router.push('/profile')}
            style={styles.profileDot}
          >
            {profile?.photo_url ? (
              <Image
                source={{ uri: `${API_BASE_URL}${profile.photo_url}` }}
                style={styles.profileImage}
                contentFit="cover"
              />
            ) : (
              <Text style={styles.profileText}>
                {profile?.username ? profile.username[0].toUpperCase() : 'R'}
              </Text>
            )}
          </Pressable>
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

        <View style={styles.radiusRow}>
          <View style={styles.nearbyToggle}>
            <Switch
              value={nearby}
              onValueChange={handleNearby}
              disabled={locating}
              accessibilityLabel="Filter plans near my location"
              trackColor={{ false: '#CBD5E1', true: '#42F27A' }}
            />
            <Text style={styles.radiusLabel}>{nearby ? 'Within' : 'Any distance'}</Text>
          </View>
          <View style={styles.radiusControls}>
            <TextInput
              value={radius}
              onChangeText={setRadius}
              keyboardType="decimal-pad"
              accessibilityLabel="Search radius in miles"
              style={[styles.radiusInput, !nearby && { opacity: 0.5 }]}
              editable={nearby && !locating}
              maxLength={6}
            />
            <Text style={styles.radiusLabel}>mi</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Use my current location"
              onPress={() => handleNearby(true)}
              disabled={locating}
              style={styles.locateButton}
            >
              {locating ? <ActivityIndicator color="#0F4C81" /> : <Ionicons name="locate-outline" size={22} color="#0F4C81" />}
            </Pressable>
          </View>
        </View>
        {nearby && !validRadius && <Text accessibilityRole="alert" style={styles.locationError}>Enter a radius from 0.1 to 500 miles.</Text>}
        {!!locationError && <Text accessibilityRole="alert" style={styles.locationError}>{locationError}</Text>}

        {loading && (
          <View style={styles.statusBox}>
            <ActivityIndicator color="#16A34A" />
            <Text style={styles.statusText}>Loading activities...</Text>
          </View>
        )}

        {!!errorMessage && (
          <View style={styles.statusBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {!loading && !errorMessage && visibleActivities.length === 0 && (!nearby || validRadius) && (
          <Text style={styles.emptyFeed}>
            {nearby ? `No plans within ${radiusMiles} miles.` : 'No plans found.'}
          </Text>
        )}

        {!loading && !errorMessage && visibleActivities.length > 0 && (
          <View style={styles.feedHeading}>
            <Text style={styles.feedTitle}>{nearby ? 'Plans near you' : 'Discover plans'}</Text>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{visibleActivities.length} live</Text>
            </View>
          </View>
        )}

        <View style={styles.feed}>
          {visibleActivities.map((activity) => {
            const distance = distanceMiles(nearby ? origin : null, activity);
            return (
            <Pressable
              key={activity.id}
              onPress={() => setSelectedActivity(activity)}
              style={styles.card}
            >
              <View style={styles.imagePlaceholder}>
                {activity.photo_url ? (
                  <Image
                    source={{ uri: `${API_BASE_URL}${activity.photo_url}` }}
                    style={styles.activityImage}
                    contentFit="cover"
                  />
                ) : (
                  <Ionicons name="calendar-outline" size={34} color="#FFFFFF" />
                )}
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
                  <Text style={styles.metaText}>
                    {activity.location}
                    {distance !== null ? ` - ${distance < 0.1 ? '<0.1' : distance.toFixed(1)} mi` : ''}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={15} color="#0F4C81" />
                  <Text style={styles.metaText}>{activity.period}</Text>
                </View>

                <View style={styles.bottomRow}>
                  <Text style={styles.interested}>
                    {activity.accepted_count} accepted
                    {activity.spots_left !== null ? ` • ${activity.spots_left} left` : ''}
                  </Text>

                  <View style={styles.joinButton}>
                    <Text style={styles.joinButtonText}>{actionLabel(activity)}</Text>
                  </View>
                </View>
              </View>
            </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={selectedActivity !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.detailSheet}>
            {selectedActivity && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.detailContent}
              >
                <View style={styles.detailHeader}>
                  <Text style={styles.detailCategory}>{selectedActivity.category}</Text>

                  <Pressable onPress={() => setSelectedActivity(null)}>
                    <Ionicons name="close-circle" size={30} color="#0F4C81" />
                  </Pressable>
                </View>

                <Text style={styles.detailTitle}>{selectedActivity.title}</Text>

                <Text style={styles.detailDescription}>
                  {selectedActivity.description || `${selectedActivity.group_name} ${isMeet(selectedActivity) ? 'posted this meet for' : 'is hosting this activity at'} ${selectedActivity.location}. It is planned for ${selectedActivity.period}.`}
                </Text>

                <View style={styles.creatorCard}>
                  <View style={styles.creatorAvatar}>
                    {selectedActivity.creator_photo_url ? (
                      <Image
                        source={{ uri: `${API_BASE_URL}${selectedActivity.creator_photo_url}` }}
                        style={styles.creatorImage}
                        contentFit="cover"
                      />
                    ) : (
                      <Text style={styles.creatorInitial}>
                        {selectedActivity.group_name[0]?.toUpperCase() ?? 'G'}
                      </Text>
                    )}
                  </View>

                  <View style={styles.creatorTextWrap}>
                    <Text style={styles.creatorLabel}>
                      {isMeet(selectedActivity) ? 'Posted by' : 'Hosted by'}
                    </Text>
                    <Text style={styles.creatorName}>{selectedActivity.group_name}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="people-outline" size={18} color="#0F4C81" />
                  <Text style={styles.detailText}>
                    {selectedActivity.accepted_count} accepted
                    {selectedActivity.max_people ? ` • ${selectedActivity.max_people} spots` : ''}
                    {selectedActivity.spots_left !== null ? ` • ${selectedActivity.spots_left} left` : ''}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={18} color="#0F4C81" />
                  <Text style={styles.detailText}>{selectedActivity.location}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={18} color="#0F4C81" />
                  <Text style={styles.detailText}>{selectedActivity.period}</Text>
                </View>

                {isCreator(selectedActivity) && (
                  <View style={styles.requestList}>
                    <Text style={styles.requestListTitle}>Requests</Text>

                    {pendingRequestsForActivity(selectedActivity.id).length === 0 && (
                      <Text style={styles.emptyRequests}>No pending requests yet.</Text>
                    )}

                    {pendingRequestsForActivity(selectedActivity.id).map((request) => (
                      <View key={request.id} style={styles.requestCard}>
                        <View style={styles.requestAvatar}>
                          {request.requester_photo_url ? (
                            <Image
                              source={{ uri: `${API_BASE_URL}${request.requester_photo_url}` }}
                              style={styles.requestImage}
                              contentFit="cover"
                            />
                          ) : (
                            <Text style={styles.requestInitial}>
                              {request.requester_name[0]?.toUpperCase() ?? 'G'}
                            </Text>
                          )}
                        </View>

                        <View style={styles.requestBody}>
                          <Text style={styles.requestName}>{request.requester_name}</Text>
                          <Text style={styles.requestMeta}>Wants to join this plan</Text>
                        </View>

                        <Pressable
                          style={styles.acceptButton}
                          disabled={savingRequestId === request.id}
                          onPress={() => handleUpdateRequest(request.id, 'accepted')}
                        >
                          <Text style={styles.acceptButtonText}>Accept</Text>
                        </Pressable>

                        <Pressable
                          style={styles.denyButton}
                          disabled={savingRequestId === request.id}
                          onPress={() => handleUpdateRequest(request.id, 'denied')}
                        >
                          <Text style={styles.denyButtonText}>Deny</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                {isCreator(selectedActivity) && (
                  <Pressable
                    style={styles.deleteAction}
                    disabled={savingRequestId === selectedActivity.id}
                    onPress={() => handleDeleteActivity(selectedActivity)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#B91C1C" />
                    <Text style={styles.deleteActionText}>
                      {savingRequestId === selectedActivity.id ? 'Deleting...' : 'Delete post'}
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  style={[
                    styles.detailAction,
                    (actionLabel(selectedActivity) === 'Denied' ||
                      actionLabel(selectedActivity) === 'Full' ||
                      actionLabel(selectedActivity) === 'No requests') &&
                      styles.detailActionDisabled,
                  ]}
                  disabled={
                    savingRequestId === selectedActivity.id ||
                    actionLabel(selectedActivity) === 'Denied' ||
                    actionLabel(selectedActivity) === 'Full' ||
                    actionLabel(selectedActivity) === 'No requests'
                  }
                  onPress={() => handlePrimaryAction(selectedActivity)}
                >
                  <Text style={styles.detailActionText}>
                    {savingRequestId === selectedActivity.id ? 'Sending...' : actionLabel(selectedActivity)}
                  </Text>
                </Pressable>

                {requestForActivity(selectedActivity.id)?.status === 'accepted' && (
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
                )}
              </ScrollView>
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
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 56,
    paddingBottom: 48,
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
    overflow: 'hidden',
    shadowColor: '#03606E',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 9,
  },

  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
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

  radiusRow: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nearbyToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radiusControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radiusLabel: { color: '#073B66', fontSize: 14, fontWeight: '700' },
  radiusInput: { width: 64, height: 44, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#B7E8F0', paddingHorizontal: 8, color: '#073B66', fontSize: 16, textAlign: 'center' },
  locateButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  locationError: { marginTop: 8, color: '#B91C1C', fontSize: 14, lineHeight: 20 },
  emptyFeed: { paddingVertical: 24, color: '#073B66', fontSize: 16, textAlign: 'center' },

  feedHeading: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  feedTitle: {
    color: '#071C4D',
    fontSize: 20,
    fontWeight: '900',
  },

  livePill: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: 10,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#049B43',
  },

  liveText: {
    color: '#0F4C81',
    fontSize: 12,
    fontWeight: '900',
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
    marginTop: 12,
    gap: 12,
  },

  card: {
    minHeight: 150,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A3DDE5',
    padding: 10,
    gap: 12,
    shadowColor: '#03606E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },

  imagePlaceholder: {
    width: 108,
    height: 132,
    flexShrink: 0,
    borderRadius: 10,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  activityImage: {
    width: '100%',
    height: '100%',
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
    flexWrap: 'wrap',
    gap: 8,
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
    maxWidth: '100%',
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
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(7, 28, 77, 0.35)',
  },

  detailSheet: {
    maxHeight: '86%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  detailContent: {
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

  creatorCard: {
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: '#F0FBFF',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  creatorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#03A63C',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  creatorImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },

  creatorInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },

  creatorTextWrap: {
    flex: 1,
  },

  creatorLabel: {
    color: '#245B91',
    fontSize: 13,
    fontWeight: '800',
  },

  creatorName: {
    marginTop: 2,
    color: '#071C4D',
    fontSize: 17,
    fontWeight: '900',
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

  detailActionDisabled: {
    backgroundColor: '#94A3B8',
  },

  detailActionText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },

  deleteAction: {
    marginTop: 18,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  deleteActionText: {
    color: '#B91C1C',
    fontSize: 16,
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

  requestList: {
    marginTop: 20,
    gap: 10,
  },

  requestListTitle: {
    color: '#071C4D',
    fontSize: 17,
    fontWeight: '900',
  },

  emptyRequests: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },

  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    padding: 10,
  },

  requestAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#03A63C',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  requestImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },

  requestInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  requestBody: {
    flex: 1,
  },

  requestName: {
    color: '#071C4D',
    fontSize: 15,
    fontWeight: '900',
  },

  requestMeta: {
    marginTop: 2,
    color: '#245B91',
    fontSize: 12,
    fontWeight: '700',
  },

  acceptButton: {
    borderRadius: 14,
    backgroundColor: '#03A63C',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  denyButton: {
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  denyButtonText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '900',
  },
});
