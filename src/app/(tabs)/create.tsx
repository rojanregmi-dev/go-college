import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createActivity } from '../../services/api';

const timeOptions = ['Now', 'Today', 'Tonight', 'Custom Date'];
const postTypes = ['Meet', 'Activity'];

export default function CreateScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [postType, setPostType] = useState('Meet');
  const [groupName, setGroupName] = useState('');
  const [location, setLocation] = useState('');
  const [selectedTime, setSelectedTime] = useState('Tonight');
  const [customTime, setCustomTime] = useState('');
  const [photoSelected, setPhotoSelected] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleCreatePlan() {
    const period = selectedTime === 'Custom Date' ? customTime.trim() : selectedTime;

    if (!title.trim() || !groupName.trim() || !location.trim() || !period) {
      Alert.alert('Missing info', 'Fill out the plan, poster or host, location, and time.');
      return;
    }

    try {
      setSaving(true);
      await createActivity({
        title: title.trim(),
        group_name: groupName.trim(),
        period,
        location: location.trim(),
        category: postType,
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>CREATE PLAN</Text>
      <Text style={styles.title}>Start something</Text>
      <Text style={styles.subtitle}>Post a campus plan for now, later today, tonight, or a future time.</Text>

      <Pressable style={styles.photoButton} onPress={() => setPhotoSelected(true)}>
        <Ionicons name={photoSelected ? 'image' : 'image-outline'} size={24} color="#0F4C81" />
        <Text style={styles.photoButtonText}>
          {photoSelected ? 'Photo selected' : 'Choose photo'}
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
        placeholder={postType === 'Meet' ? 'Posted by, like Rojan' : 'Hosted by, like GO Builders'}
        placeholderTextColor="#94A3B8"
        style={styles.input}
      />
      <TextInput value={location} onChangeText={setLocation} placeholder="Location" placeholderTextColor="#94A3B8" style={styles.input} />

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

      <Pressable onPress={handleCreatePlan} disabled={saving} style={[styles.createButton, saving && styles.createButtonDisabled]}>
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
  photoButtonText: { color: '#0F4C81', fontSize: 16, fontWeight: '900' },
  input: { marginTop: 14, backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 18, paddingVertical: 16, fontSize: 16, color: '#0F172A', fontWeight: '600' },
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
