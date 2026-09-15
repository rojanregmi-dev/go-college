import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createUser, loginUser } from '../services/api';

function dateOnly(value: Date) {
  return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'login' | 'create'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [birthday, setBirthday] = useState('');
  const [pickerDate, setPickerDate] = useState(new Date(2005, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const creating = mode === 'create';

  function changeMode(nextMode: 'login' | 'create') {
    setMode(nextMode);
    setError('');
    setPassword('');
    setShowPassword(false);
    setShowDatePicker(false);
  }

  async function handleAuth() {
    if (saving) return;
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (creating && (username.trim().length < 2 || !birthday)) {
      setError('Add a username and your date of birth.');
      return;
    }
    if (!password || (creating && password.length < 8)) {
      setError(creating ? 'Use at least 8 characters for your password.' : 'Enter your password.');
      return;
    }
    try {
      setSaving(true);
      const credentials = { email: email.trim().toLowerCase(), password };
      if (creating) {
        await createUser({ ...credentials, username: username.trim(), date_of_birth: birthday });
      } else {
        await loginUser(credentials);
      }
      setPassword('');
      router.replace('/(tabs)');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not connect. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      >
        <View style={styles.content}>
          <View style={styles.brandRow}>
            <Text style={styles.brand}>GO <Text style={styles.brandAccent}>DISCOVER</Text></Text>
            <Ionicons name="flash" size={30} color="#04924A" />
          </View>
          <Text style={styles.tagline}>Got <Text style={styles.accent}>time?</Text></Text>
          <Text style={styles.heading}>{creating ? 'Make room for something good.' : 'Good to see you again.'}</Text>

          <View style={styles.modeRow} accessibilityRole="tablist">
            {(['login', 'create'] as const).map((value) => (
              <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: mode === value }}
                disabled={saving} onPress={() => changeMode(value)}
                style={[styles.modeButton, mode === value && styles.modeSelected]}>
                <Text style={styles.modeText}>{value === 'login' ? 'Log in' : 'Create account'}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Email</Text>
          <View style={styles.field}>
            <Ionicons name="mail-outline" size={20} color="#0F4C81" />
            <TextInput accessibilityLabel="Email" value={email} onChangeText={setEmail}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              autoComplete="email" textContentType="emailAddress"
              placeholder="you@example.com" placeholderTextColor="#62809A"
              style={styles.input} editable={!saving} maxLength={254} />
          </View>

          {creating && (
            <>
              <Text style={styles.label}>Username</Text>
              <View style={styles.field}>
                <Ionicons name="person-outline" size={20} color="#0F4C81" />
                <TextInput accessibilityLabel="Username" value={username} onChangeText={setUsername}
                  placeholder="Name people see" placeholderTextColor="#62809A"
                  style={styles.input} editable={!saving} maxLength={40}
                  autoCapitalize="none" autoCorrect={false} autoComplete="username-new" />
              </View>
              <Text style={styles.label}>Date of birth</Text>
              <View style={styles.field}>
                <Ionicons name="calendar-outline" size={20} color="#0F4C81" />
                {Platform.OS === 'web' ? (
                  <input type="date" aria-label="Date of birth" value={birthday}
                    onChange={(event) => setBirthday(event.target.value)}
                    min="1900-01-01" max={dateOnly(new Date())} disabled={saving}
                    style={{ flex: 1, minWidth: 0, width: '100%', height: 52, border: 0, background: 'transparent', color: '#071C4D', fontSize: 16, fontFamily: 'inherit' }} />
                ) : (
                  <Pressable accessibilityRole="button" accessibilityLabel="Date of birth"
                    onPress={() => setShowDatePicker(true)} disabled={saving} style={styles.dateButton}>
                    <Text style={[styles.dateText, !birthday && styles.placeholder]}>
                      {birthday ? new Date(birthday + 'T12:00:00').toLocaleDateString() : 'Choose your birthday'}
                    </Text>
                  </Pressable>
                )}
              </View>
              {showDatePicker && Platform.OS !== 'web' && (
                <View style={styles.datePicker}>
                  <DateTimePicker value={pickerDate} mode="date" presentation="dialog"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'} themeVariant="light"
                    minimumDate={new Date(1900, 0, 1)} maximumDate={new Date()} accentColor="#04924A"
                    onDismiss={() => setShowDatePicker(false)}
                    onValueChange={(_, value) => {
                      setPickerDate(value);
                      if (Platform.OS === 'android') {
                        setBirthday(dateOnly(value));
                        setShowDatePicker(false);
                      }
                    }} />
                  {Platform.OS === 'ios' && (
                    <Pressable accessibilityRole="button"
                      onPress={() => { setBirthday(dateOnly(pickerDate)); setShowDatePicker(false); }}
                      style={styles.dateDone}>
                      <Text style={styles.modeText}>Done</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </>
          )}

          <Text style={styles.label}>Password</Text>
          <View style={styles.field}>
            <Ionicons name="lock-closed-outline" size={20} color="#0F4C81" />
            <TextInput accessibilityLabel="Password" value={password} onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder={creating ? 'At least 8 characters' : 'Your password'} placeholderTextColor="#62809A"
              autoCapitalize="none" autoCorrect={false} maxLength={128}
              autoComplete={creating ? 'new-password' : 'current-password'}
              textContentType={creating ? 'newPassword' : 'password'}
              returnKeyType="go" onSubmitEditing={handleAuth}
              style={styles.input} editable={!saving} />
            <Pressable accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color="#0F4C81" />
            </Pressable>
          </View>
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Pressable accessibilityRole="button"
            accessibilityLabel={creating ? 'Create my account' : 'Log in to GO Discover'}
            onPress={handleAuth} disabled={saving} style={[styles.primaryButton, saving && styles.disabled]}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : (
              <>
                <Text style={styles.primaryText}>{creating ? "Let's go" : 'Log in'}</Text>
                <Ionicons name="arrow-forward" size={21} color="#FFFFFF" />
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#BFF7FA' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 22, justifyContent: 'center' },
  content: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brand: { color: '#071C4D', fontSize: 30, fontWeight: '900' },
  brandAccent: { fontSize: 20 },
  tagline: { marginTop: 24, color: '#071C4D', fontSize: 40, lineHeight: 48, fontWeight: '900' },
  accent: { color: '#04924A' },
  heading: { marginTop: 4, color: '#245B91', fontSize: 19, lineHeight: 26, fontWeight: '600' },
  modeRow: { marginTop: 24, flexDirection: 'row', gap: 6, padding: 4, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 8 },
  modeButton: { flex: 1, minHeight: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  modeSelected: { backgroundColor: '#42F27A' },
  modeText: { color: '#071C4D', fontSize: 15, fontWeight: '800' },
  label: { marginTop: 18, marginBottom: 7, color: '#071C4D', fontSize: 14, fontWeight: '800' },
  field: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#A3DDE5', backgroundColor: '#FFFFFF' },
  input: { flex: 1, minWidth: 0, minHeight: 52, paddingVertical: 12, color: '#071C4D', fontSize: 16 },
  eyeButton: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  dateButton: { flex: 1, minHeight: 52, justifyContent: 'center' },
  dateText: { color: '#071C4D', fontSize: 16 },
  placeholder: { color: '#62809A' },
  datePicker: { marginTop: 8, borderRadius: 8, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  dateDone: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: '#DDEAF2' },
  error: { marginTop: 14, color: '#A92436', fontSize: 14, lineHeight: 20 },
  primaryButton: { marginTop: 24, minHeight: 54, borderRadius: 8, paddingHorizontal: 20, backgroundColor: '#049B43', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  disabled: { opacity: 0.65 },
  primaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
});
