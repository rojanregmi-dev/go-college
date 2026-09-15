import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getProfile, updateProfile } from '../../services/api';

export default function ProfileScreen() {
  const [username, setUsername] = useState('');
  const [userCode, setUserCode] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoSelected, setPhotoSelected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

    try {
      setSaving(true);

      await updateProfile({
        username: username.trim(),
        bio: bio.trim(),
        photo_url: photoUrl.trim(),
      });

      Alert.alert('Profile saved', 'Your profile was updated.');
    } catch (error) {
      Alert.alert('Connection error', 'Could not save your profile.');
    } finally {
      setSaving(false);
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
          <Pressable style={styles.photoButton} onPress={() => setPhotoSelected(true)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{username ? username[0].toUpperCase() : 'G'}</Text>
            </View>
            <View style={styles.photoTextWrap}>
              <Text style={styles.photoTitle}>{photoSelected ? 'Photo selected' : 'Upload photo'}</Text>
              <Text style={styles.photoSubtitle}>Real upload connects later with backend storage.</Text>
            </View>
            <Ionicons name="image-outline" size={23} color="#0F4C81" />
          </Pressable>

          <View style={styles.idCard}>
            <Text style={styles.idLabel}>Your ID</Text>
            <Text style={styles.idValue}>{userCode}</Text>
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
  avatarText: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  photoTextWrap: { flex: 1 },
  photoTitle: { color: '#071C4D', fontSize: 18, fontWeight: '900' },
  photoSubtitle: { marginTop: 3, color: '#245B91', fontSize: 13, fontWeight: '700' },
  idCard: { marginTop: 16, borderRadius: 22, backgroundColor: '#FFFFFF', padding: 18 },
  idLabel: { color: '#245B91', fontSize: 13, fontWeight: '800' },
  idValue: { marginTop: 5, color: '#071C4D', fontSize: 24, fontWeight: '900' },
  label: { marginTop: 20, color: '#071C4D', fontSize: 15, fontWeight: '900' },
  input: { marginTop: 9, borderRadius: 18, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, color: '#071C4D', fontWeight: '700' },
  bioInput: { minHeight: 112, textAlignVertical: 'top' },
  saveButton: { marginTop: 24, borderRadius: 22, backgroundColor: '#03A63C', paddingVertical: 16, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.65 },
  saveButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
});
