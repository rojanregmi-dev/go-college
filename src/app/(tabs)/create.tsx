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
      Alert.alert('Connection error', 'GO College could not create this plan.');
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Text style={styles.eyebrow}>CREATE PLAN</Text>
      <Text style={styles.title}>Start something</Text>
      <Text style={styles.subtitle}>Post a campus plan for now, later today, tonight, or a future time.</Text>

      <Pressable style={styles.photoButton} onPress={handlePickPhoto}>
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
        <View style={styles.locationButton}>
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

      <Pressable onPress={handleCreatePlan} disabled={saving || findingLocation || uploadingPhoto} style={[styles.createButton, (saving || findingLocation || uploadingPhoto) && styles.createButtonDisabled]}>
        <Text style={styles.createButtonText}>{saving ? 'Creating...' : 'Create plan'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAF8' },
  content: { paddingHorizontal: 24, paddingTop: 72, paddingBottom: 32 },
  eyebrow: { fontSize: 12, fontWeight: '800', color: '#16A34A', letterSpacing: 1.5 },
  title: { marginTop: 8, fontSize: 34, fontWeight: '900', color: '#0F172A' },
  subtitle: { marginTop: 12, marginBottom: 24, fontSize: 16, lineHeight: 23, color: '#64748B' },
  photoButton: { minHeight: 92, borderRadius: 20, borderWidth: 1, borderColor: '#B7E8F0', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoPreview: { width: '100%', height: 150, borderRadius: 18 },
  photoButtonText: { color: '#0F4C81', fontSize: 16, fontWeight: '900' },
  input: { marginTop: 14, backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 18, paddingVertical: 16, fontSize: 16, color: '#0F172A', fontWeight: '600' },
  locationButton: { marginTop: 10, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  locationText: { flex: 1, color: '#0F4C81', fontSize: 15, lineHeight: 21, fontWeight: '600' },
  addressRow: { marginTop: 10, flexDirection: 'row', borderWidth: 1, borderColor: '#B7E8F0', borderRadius: 8, backgroundColor: '#FFFFFF' },
  addressInput: { flex: 1, minWidth: 0, paddingHorizontal: 12, paddingVertical: 14, color: '#0F172A', fontSize: 15 },
  searchAddressButton: { width: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  locationStatus: { marginTop: 12, color: '#475569', fontSize: 14 },
  locationError: { marginTop: 10, color: '#B91C1C', fontSize: 14, lineHeight: 20 },
  descriptionInput: { minHeight: 96, textAlignVertical: 'top' },
  sectionLabel: { marginTop: 24, marginBottom: 12, fontSize: 15, fontWeight: '900', color: '#0F172A' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeOption: { paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  timeOptionSelected: { backgroundColor: '#DCFCE7', borderColor: '#16A34A' },
  timeText: { color: '#334155', fontSize: 15, fontWeight: '800' },
  timeTextSelected: { color: '#15803D' },
  createButton: { marginTop: 28, backgroundColor: '#2563EB', borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  createButtonDisabled: { opacity: 0.65 },
  createButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
});
