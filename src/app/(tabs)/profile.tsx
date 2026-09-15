import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextStyle } from 'react-native';
import { API_BASE_URL, getProfile, logoutUser, updateProfile, uploadFile } from '../../services/api';

export default function ProfileScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [userCode, setUserCode] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoSelected, setPhotoSelected] = useState(false);
  const [showUserCode, setShowUserCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function loadProfile() {
        try {
          setLoading(true);
          setShowUserCode(false);

          const profile = await getProfile();

          setUsername(profile.username);
          setUserCode(profile.user_code);
          setEmail(profile.email || '');
          setBirthday(profile.date_of_birth || '');
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

    try {
      setSaving(true);

      await updateProfile({
        username: username.trim(),
        bio: bio.trim(),
        photo_url: photoUrl.trim(),
      }, userCode);

      Alert.alert('Profile saved', 'Your profile was updated.');
    } catch (error) {
      Alert.alert('Connection error', 'Could not save your profile.');
    } finally {
      setSaving(false);
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

  function handleSwitchUser() {
    logoutUser();
    router.replace('/login');
  }

  function handleLogout() {
    logoutUser();
    router.replace('/login');
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
          <Text style={styles.eyebrow}>PROFILE</Text>
          <Text style={styles.title}>Your identity</Text>
          <Text style={styles.subtitle}>The person behind every plan.</Text>
        </View>
        <View style={styles.headingIcon}>
          <Ionicons name="person" size={25} color="#FFFFFF" />
        </View>
      </View>

      {loading && (
        <View style={styles.loadingCard}>
          <ActivityIndicator color="#16A34A" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      )}

      {!loading && (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose profile photo"
            disabled={uploadingPhoto}
            style={styles.photoButton}
            onPress={handlePickPhoto}
          >
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
            <View style={styles.idHeading}>
              <View>
                <Text style={styles.idLabel}>PRIVATE USER ID</Text>
                <Text style={styles.idHint}>{showUserCode ? 'Visible only to you' : 'Hidden by default'}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showUserCode ? 'Hide User ID' : 'Reveal User ID'}
                accessibilityState={{ expanded: showUserCode }}
                hitSlop={10}
                onPress={() => setShowUserCode((visible) => !visible)}
                style={styles.revealButton}
              >
                <Ionicons
                  name={showUserCode ? 'eye-off-outline' : 'eye-outline'}
                  size={21}
                  color="#071C4D"
                />
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showUserCode ? `User ID ${userCode}. Tap to hide.` : 'User ID hidden. Tap to reveal.'}
              onPress={() => setShowUserCode((visible) => !visible)}
              style={styles.idValueRow}
            >
              <Ionicons name="key-outline" size={18} color="#8BDBE5" />
              <Text
                selectable={showUserCode}
                style={[styles.idInput, Platform.OS === 'web' && ({ wordBreak: 'break-all' } as TextStyle)]}
              >
                {showUserCode ? userCode : 'Tap to reveal your User ID'}
              </Text>
            </Pressable>

            <View style={styles.authButtonRow}>
              <Pressable style={styles.switchButton} onPress={handleSwitchUser}>
                <Ionicons name="people-outline" size={17} color="#071C4D" />
                <Text style={styles.switchButtonText}>Switch user</Text>
              </Pressable>

              <Pressable style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={17} color="#FFFFFF" />
                <Text style={styles.logoutButtonText}>Logout</Text>
              </Pressable>
            </View>
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

          <View style={styles.accountDetails}>
            <View style={styles.accountHeading}>
              <Ionicons name="lock-closed-outline" size={18} color="#0F4C81" />
              <Text style={styles.accountTitle}>Private account details</Text>
            </View>
            <Text style={styles.label}>Email</Text>
            <Text selectable accessibilityLabel="Account email" style={styles.accountValue}>{email}</Text>
            <Text style={styles.label}>Date of birth</Text>
            <Text accessibilityLabel="Account date of birth" style={styles.accountValue}>
              {birthday ? new Date(birthday + 'T12:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
            </Text>
          </View>

          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.saveButtonText}>Save profile</Text>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              </>
            )}
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#BFF7FA' },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 64, paddingBottom: 48 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  headingCopy: { flex: 1 },
  headingIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#049B43', alignItems: 'center', justifyContent: 'center', shadowColor: '#03606E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 10 },
  eyebrow: { fontSize: 12, fontWeight: '900', color: '#04924A', letterSpacing: 1.5 },
  title: { marginTop: 7, color: '#071C4D', fontSize: 36, lineHeight: 42, fontWeight: '900' },
  subtitle: { marginTop: 5, color: '#245B91', fontSize: 17, lineHeight: 24, fontWeight: '700' },
  loadingCard: { marginTop: 24, borderRadius: 12, backgroundColor: '#FFFFFF', padding: 18, gap: 10 },
  loadingText: { color: '#245B91', fontSize: 15, fontWeight: '800' },
  photoButton: { marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, borderWidth: 1, borderColor: '#A3DDE5', backgroundColor: '#FFFFFF', padding: 15, shadowColor: '#03606E', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 12 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#03A63C', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 58, height: 58, borderRadius: 29 },
  avatarText: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  photoTextWrap: { flex: 1 },
  photoTitle: { color: '#071C4D', fontSize: 18, fontWeight: '900' },
  photoSubtitle: { marginTop: 3, color: '#245B91', fontSize: 13, fontWeight: '700' },
  idCard: { marginTop: 16, borderRadius: 14, backgroundColor: '#071C4D', padding: 18, shadowColor: '#03606E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 12 },
  idHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  idLabel: { color: '#64F58C', fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  idHint: { marginTop: 4, color: '#B7E8F0', fontSize: 12, fontWeight: '600' },
  revealButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#64F58C', alignItems: 'center', justifyContent: 'center' },
  idValueRow: { minHeight: 44, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: 1, borderTopColor: '#244A72', paddingTop: 12 },
  idInput: { color: '#FFFFFF', fontSize: 14, lineHeight: 21, fontWeight: '800', flex: 1 },
  accountDetails: { marginTop: 24, borderRadius: 14, borderWidth: 1, borderColor: '#A3DDE5', backgroundColor: 'rgba(255,255,255,0.72)', padding: 16 },
  accountHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accountTitle: { color: '#071C4D', fontSize: 17, fontWeight: '800', flex: 1 },
  accountValue: { marginTop: 6, color: '#245B91', fontSize: 16, lineHeight: 23 },
  authButtonRow: { marginTop: 14, flexDirection: 'row', gap: 10 },
  switchButton: { minHeight: 42, flex: 1, borderRadius: 8, backgroundColor: '#FFFFFF', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  switchButtonText: { color: '#071C4D', fontSize: 14, fontWeight: '900' },
  logoutButton: { minHeight: 42, flex: 1, borderRadius: 8, backgroundColor: '#B42336', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  logoutButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  label: { marginTop: 20, color: '#071C4D', fontSize: 15, fontWeight: '900' },
  input: { marginTop: 9, borderRadius: 8, borderWidth: 1, borderColor: '#A3DDE5', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, color: '#071C4D', fontWeight: '700' },
  bioInput: { minHeight: 112, textAlignVertical: 'top' },
  saveButton: { marginTop: 24, minHeight: 54, borderRadius: 8, backgroundColor: '#049B43', paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  saveButtonDisabled: { opacity: 0.65 },
  saveButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
});
