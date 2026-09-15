import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { API_BASE_URL, createActivity, getProfile, uploadFile } from '../../services/api';
import { describeLocation, findMeetingLocations, MeetingLocation, requestUserLocation } from '../../services/location';

const timeOptions = ['Now', 'Today', 'Tonight', 'Custom Date'];
const postTypes = ['Meet', 'Activity'];

export default function CreateScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [postType, setPostType] = useState('Meet');
  const [groupName, setGroupName] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [meetingLocation, setMeetingLocation] = useState<MeetingLocation | null>(null);
  const [locationResults, setLocationResults] = useState<MeetingLocation[]>([]);
  const [findingLocation, setFindingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [description, setDescription] = useState('');
  const [maxPeople, setMaxPeople] = useState('');
  const [selectedTime, setSelectedTime] = useState('Tonight');
  const [customTime, setCustomTime] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoSelected, setPhotoSelected] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleCreatePlan() {
    const period = selectedTime === 'Custom Date' ? customTime.trim() : selectedTime;

    if (!title.trim() || (postType === 'Activity' && !groupName.trim()) || !location.trim() || !period) {
      Alert.alert('Missing info', 'Fill out the plan, poster or host, location, and time.');
      return;
    }

    if (!meetingLocation) {
      setLocationError('Choose and confirm a meeting location before posting.');
      return;
    }

    try {
      setSaving(true);
      const profile = await getProfile();
      const displayName = postType === 'Meet' ? profile.username : groupName.trim();

      await createActivity({
        title: title.trim(),
        group_name: displayName,
        period,
        location: location.trim(),
        latitude: meetingLocation.latitude,
        longitude: meetingLocation.longitude,
        category: postType,
        description: description.trim(),
        photo_url: photoUrl,
        creator_code: profile.user_code,
        creator_photo_url: profile.photo_url,
        max_people: Number(maxPeople) || 0,
        interested_count: 1,
      });

      Alert.alert('Plan created', 'Your plan was added to the campus feed.');
      router.push('/');
    } catch (error) {
      Alert.alert('Connection error', 'GO Discover could not create this plan.');
    } finally {
      setSaving(false);
    }
  }

  async function handleFindLocation(usePhone: boolean) {
    if (findingLocation) return;
    setFindingLocation(true);
    setLocationError('');
    setMeetingLocation(null);
    setLocationResults([]);
    if (usePhone) setAddress('');
    try {
      const results = usePhone
        ? [await describeLocation(await requestUserLocation(), 'Current location')]
        : await findMeetingLocations(address);
      setLocationResults(results);
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : 'Could not find this location.');
    } finally {
      setFindingLocation(false);
    }
  }

  function confirmLocation(result: MeetingLocation) {
    setMeetingLocation(result);
    setLocationResults([]);
    if (!location.trim()) setLocation(result.label);
  }

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add a post photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.82,
    });

    if (result.canceled) {
      return;
    }

    try {
      setUploadingPhoto(true);

      const asset = result.assets[0];
      const upload = await uploadFile(
        asset.uri,
        asset.fileName ?? undefined,
        asset.mimeType ?? undefined,
        'activities'
      );

      setPhotoUrl(upload.url);
      setPhotoSelected(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not upload this photo.';
      Alert.alert('Upload failed', message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>CREATE PLAN</Text>
          <Text style={styles.title}>Start something</Text>
          <Text style={styles.subtitle}>Turn free time into a plan people can join.</Text>
        </View>
        <View style={styles.headingIcon}>
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose a photo for this plan"
        disabled={uploadingPhoto || saving}
        style={styles.photoButton}
        onPress={handlePickPhoto}
      >
        {photoUrl ? (
          <Image
            source={{ uri: `${API_BASE_URL}${photoUrl}` }}
            style={styles.photoPreview}
            contentFit="cover"
          />
        ) : (
          <Ionicons name="image-outline" size={24} color="#0F4C81" />
        )}
        <Text style={styles.photoButtonText}>
          {uploadingPhoto ? 'Uploading...' : photoSelected ? 'Photo selected' : 'Choose photo'}
        </Text>
      </Pressable>

      <Text style={styles.sectionLabel}>What are you posting?</Text>
      <View style={styles.timeGrid}>
        {postTypes.map((type) => {
          const selected = postType === type;

          return (
            <Pressable
              key={type}
              onPress={() => setPostType(type)}
              style={[styles.timeOption, selected && styles.timeOptionSelected]}
            >
              <Text style={[styles.timeText, selected && styles.timeTextSelected]}>
                {type}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput value={title} onChangeText={setTitle} placeholder="Plan title" placeholderTextColor="#94A3B8" style={styles.input} />
      <TextInput
        value={groupName}
        onChangeText={setGroupName}
        placeholder={postType === 'Meet' ? 'Meet posts use your profile name' : 'Hosted by, like GO Builders'}
        placeholderTextColor="#94A3B8"
        style={styles.input}
        editable={postType === 'Activity'}
      />
      <Text style={styles.sectionLabel}>Meeting location</Text>
      <TextInput value={location} onChangeText={setLocation} placeholder="Place name, like Alkek Library" placeholderTextColor="#94A3B8" style={styles.input} />
      <Pressable
        accessibilityRole="button"
        onPress={() => handleFindLocation(true)}
        disabled={findingLocation || saving}
        style={styles.locationButton}
      >
        <Ionicons name="locate-outline" size={20} color="#0F4C81" />
        <Text style={styles.locationText}>Use my location</Text>
      </Pressable>
      <View style={styles.addressRow}>
        <TextInput
          value={address}
          onChangeText={(value) => {
            setAddress(value);
            setMeetingLocation(null);
            setLocationResults([]);
            setLocationError('');
          }}
          editable={!findingLocation && !saving}
          placeholder="Street address, city, state"
          placeholderTextColor="#64748B"
          accessibilityLabel="Meeting address"
          style={styles.addressInput}
          returnKeyType="search"
          onSubmitEditing={() => { if (address.trim()) handleFindLocation(false); }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Find meeting address"
          disabled={findingLocation || saving || !address.trim()}
          onPress={() => handleFindLocation(false)}
          style={styles.searchAddressButton}
        >
          <Ionicons name="search-outline" size={22} color="#0F4C81" />
        </Pressable>
      </View>
      {findingLocation && <ActivityIndicator style={styles.locationStatus} color="#16A34A" />}
      {locationResults.length > 0 && <Text style={styles.locationStatus}>Confirm meeting location</Text>}
      {locationResults.map((result, index) => (
        <Pressable key={index} accessibilityRole="button" onPress={() => confirmLocation(result)} style={styles.locationButton}>
          <Ionicons name="location-outline" size={20} color="#0F4C81" />
          <Text style={styles.locationText}>{result.label}</Text>
          <Ionicons name="checkmark-outline" size={20} color="#15803D" />
        </Pressable>
      ))}
      {meetingLocation && (
        <View style={[styles.locationButton, styles.confirmedLocation]}>
          <Ionicons name="checkmark-circle" size={20} color="#15803D" />
          <Text style={styles.locationText}>{meetingLocation.label}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Clear meeting location" hitSlop={10} disabled={saving} onPress={() => setMeetingLocation(null)}>
            <Ionicons name="close-outline" size={22} color="#0F4C81" />
          </Pressable>
        </View>
      )}
      {!!locationError && <Text accessibilityRole="alert" style={styles.locationError}>{locationError}</Text>}
      <TextInput value={description} onChangeText={setDescription} placeholder="Description" placeholderTextColor="#94A3B8" style={[styles.input, styles.descriptionInput]} multiline />
      <TextInput value={maxPeople} onChangeText={setMaxPeople} placeholder="How many people?" placeholderTextColor="#94A3B8" style={styles.input} keyboardType="number-pad" />

      <Text style={styles.sectionLabel}>When?</Text>
      <View style={styles.timeGrid}>
        {timeOptions.map((option) => {
          const selected = selectedTime === option;
          return (
            <Pressable key={option} onPress={() => setSelectedTime(option)} style={[styles.timeOption, selected && styles.timeOptionSelected]}>
              <Text style={[styles.timeText, selected && styles.timeTextSelected]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      {selectedTime === 'Custom Date' && (
        <TextInput value={customTime} onChangeText={setCustomTime} placeholder="Example: Friday at 6 PM" placeholderTextColor="#94A3B8" style={styles.input} />
      )}

      <Pressable
        accessibilityRole="button"
        onPress={handleCreatePlan}
        disabled={saving || findingLocation || uploadingPhoto}
        style={[styles.createButton, (saving || findingLocation || uploadingPhoto) && styles.createButtonDisabled]}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.createButtonText}>Create plan</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#BFF7FA' },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 64, paddingBottom: 52 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  headingCopy: { flex: 1 },
  headingIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#049B43', alignItems: 'center', justifyContent: 'center', shadowColor: '#03606E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 10 },
  eyebrow: { fontSize: 12, fontWeight: '900', color: '#04924A', letterSpacing: 1.5 },
  title: { marginTop: 7, fontSize: 36, lineHeight: 42, fontWeight: '900', color: '#071C4D' },
  subtitle: { marginTop: 5, fontSize: 17, lineHeight: 24, color: '#245B91', fontWeight: '700' },
  photoButton: { minHeight: 108, marginTop: 24, borderRadius: 14, borderWidth: 1, borderColor: '#A3DDE5', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden', shadowColor: '#03606E', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 12 },
  photoPreview: { width: '100%', height: 176 },
  photoButtonText: { color: '#0F4C81', fontSize: 16, fontWeight: '900' },
  input: { marginTop: 12, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#A3DDE5', paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, color: '#071C4D', fontWeight: '600' },
  locationButton: { marginTop: 10, minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 8, borderWidth: 1, borderColor: '#A3DDE5', backgroundColor: 'rgba(255,255,255,0.72)', paddingHorizontal: 13, paddingVertical: 10 },
  confirmedLocation: { borderColor: '#049B43', backgroundColor: '#E4FDEB' },
  locationText: { flex: 1, color: '#0F4C81', fontSize: 15, lineHeight: 21, fontWeight: '600' },
  addressRow: { marginTop: 10, flexDirection: 'row', borderWidth: 1, borderColor: '#A3DDE5', borderRadius: 8, backgroundColor: '#FFFFFF' },
  addressInput: { flex: 1, minWidth: 0, paddingHorizontal: 12, paddingVertical: 14, color: '#0F172A', fontSize: 15 },
  searchAddressButton: { width: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  locationStatus: { marginTop: 12, color: '#475569', fontSize: 14 },
  locationError: { marginTop: 10, color: '#B91C1C', fontSize: 14, lineHeight: 20 },
  descriptionInput: { minHeight: 96, textAlignVertical: 'top' },
  sectionLabel: { marginTop: 24, marginBottom: 10, fontSize: 15, fontWeight: '900', color: '#071C4D' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeOption: { minHeight: 44, paddingVertical: 11, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.78)', borderRadius: 8, borderWidth: 1, borderColor: '#A3DDE5', justifyContent: 'center' },
  timeOptionSelected: { backgroundColor: '#64F58C', borderColor: '#049B43' },
  timeText: { color: '#245B91', fontSize: 15, fontWeight: '800' },
  timeTextSelected: { color: '#071C4D' },
  createButton: { marginTop: 28, minHeight: 56, backgroundColor: '#049B43', borderRadius: 8, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#03606E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 12 },
  createButtonDisabled: { opacity: 0.65 },
  createButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
});
