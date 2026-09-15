import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { API_BASE_URL, getProfile, setCurrentUserCode, updateProfile, uploadFile } from '../../services/api';

export default function ProfileScreen() {
  const [username, setUsername] = useState('');
  const [userCode, setUserCode] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoSelected, setPhotoSelected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function loadProfile() {
        try {
          setLoading(true);

          const profile = await getProfile();

          setUsername(profile.username);
          setUserCode(profile.user_code);
          setBio(profile.bio);
          setPhotoUrl(profile.photo_url);
        } catch (error) {
          Alert.alert('Connection error', 'Could not load your profile.');
        } finally {
          setLoading(false);
        }
      }

      loadProfile();
    }, [])
  );

  async function handleSaveProfile() {
    if (!username.trim()) {
      Alert.alert('Missing username', 'Add a username before saving.');
      return;
    }

    if (!userCode.trim()) {
      Alert.alert('Missing ID', 'Add a demo ID before saving.');
      return;
    }

    try {
      setSaving(true);
      const cleanCode = setCurrentUserCode(userCode);

      await updateProfile({
        username: username.trim(),
        bio: bio.trim(),
        photo_url: photoUrl.trim(),
      }, cleanCode);

      setUserCode(cleanCode);

      Alert.alert('Profile saved', 'Your profile was updated.');
    } catch (error) {
      Alert.alert('Connection error', 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSwitchUser() {
    if (!userCode.trim()) {
      Alert.alert('Missing ID', 'Type a demo ID like alex-txst.');
      return;
    }

    try {
      setLoading(true);

      const cleanCode = setCurrentUserCode(userCode);
      const profile = await getProfile(cleanCode);

      setUsername(profile.username);
      setUserCode(profile.user_code);
      setBio(profile.bio);
      setPhotoUrl(profile.photo_url);
      setPhotoSelected(false);
    } catch (error) {
      Alert.alert('Connection error', 'Could not switch demo user.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to upload a profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
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
        'profiles'
      );
      const nextPhotoUrl = upload.url;

      setPhotoUrl(nextPhotoUrl);
      setPhotoSelected(true);

      await updateProfile({
        username: username.trim(),
        bio: bio.trim(),
        photo_url: nextPhotoUrl,
      }, userCode);

      Alert.alert('Photo uploaded', 'Your profile photo was saved.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not upload your profile photo.';
      Alert.alert('Upload failed', message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>PROFILE</Text>
      <Text style={styles.title}>Your identity</Text>
      <Text style={styles.subtitle}>This is what hosts and group members see.</Text>

      {loading && (
        <View style={styles.loadingCard}>
          <ActivityIndicator color="#16A34A" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      )}

      {!loading && (
        <>
          <Pressable style={styles.photoButton} onPress={handlePickPhoto}>
            <View style={styles.avatar}>
              {photoUrl ? (
                <Image
                  source={{ uri: `${API_BASE_URL}${photoUrl}` }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <Text style={styles.avatarText}>{username ? username[0].toUpperCase() : 'G'}</Text>
              )}
            </View>
            <View style={styles.photoTextWrap}>
              <Text style={styles.photoTitle}>
                {uploadingPhoto ? 'Uploading...' : photoSelected || photoUrl ? 'Photo uploaded' : 'Upload photo'}
              </Text>
              <Text style={styles.photoSubtitle}>Choose a profile image from your phone.</Text>
            </View>
            <Ionicons name="image-outline" size={23} color="#0F4C81" />
          </Pressable>

          <View style={styles.idCard}>
            <Text style={styles.idLabel}>Demo user ID</Text>
            <TextInput
              value={userCode}
              onChangeText={setUserCode}
              autoCapitalize="none"
              placeholder="example: alex-txst"
              placeholderTextColor="#94A3B8"
              style={styles.idInput}
            />
            <Pressable style={styles.switchButton} onPress={handleSwitchUser}>
              <Text style={styles.switchButtonText}>Switch user</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Username"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />

          <Text style={styles.label}>Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Tell people what you are usually down for"
            placeholderTextColor="#94A3B8"
            style={[styles.input, styles.bioInput]}
            multiline
          />

          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save profile'}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#BFF7FA' },
  content: { paddingHorizontal: 18, paddingTop: 72, paddingBottom: 32 },
  eyebrow: { fontSize: 12, fontWeight: '900', color: '#04924A', letterSpacing: 1.5 },
  title: { marginTop: 8, color: '#071C4D', fontSize: 38, fontWeight: '900' },
  subtitle: { marginTop: 8, color: '#071C4D', fontSize: 18, lineHeight: 25, fontWeight: '700' },
  loadingCard: { marginTop: 24, borderRadius: 22, backgroundColor: '#FFFFFF', padding: 18, gap: 10 },
  loadingText: { color: '#245B91', fontSize: 15, fontWeight: '800' },
  photoButton: { marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 22, backgroundColor: '#FFFFFF', padding: 16 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#03A63C', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 58, height: 58, borderRadius: 29 },
  avatarText: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  photoTextWrap: { flex: 1 },
  photoTitle: { color: '#071C4D', fontSize: 18, fontWeight: '900' },
  photoSubtitle: { marginTop: 3, color: '#245B91', fontSize: 13, fontWeight: '700' },
  idCard: { marginTop: 16, borderRadius: 22, backgroundColor: '#FFFFFF', padding: 18 },
  idLabel: { color: '#245B91', fontSize: 13, fontWeight: '800' },
  idInput: { marginTop: 8, color: '#071C4D', fontSize: 22, fontWeight: '900' },
  switchButton: { marginTop: 12, alignSelf: 'flex-start', borderRadius: 16, backgroundColor: '#E0F7FF', paddingHorizontal: 14, paddingVertical: 10 },
  switchButtonText: { color: '#0F4C81', fontSize: 14, fontWeight: '900' },
  label: { marginTop: 20, color: '#071C4D', fontSize: 15, fontWeight: '900' },
  input: { marginTop: 9, borderRadius: 18, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, color: '#071C4D', fontWeight: '700' },
  bioInput: { minHeight: 112, textAlignVertical: 'top' },
  saveButton: { marginTop: 24, borderRadius: 22, backgroundColor: '#03A63C', paddingVertical: 16, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.65 },
  saveButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
});
