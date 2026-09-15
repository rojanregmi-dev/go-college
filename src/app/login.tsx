import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createUser, loginUser } from '../services/api';

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'create'>('login');
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAuth() {
    if (!userId.trim() || !password.trim()) {
      Alert.alert('Missing info', 'Add your User ID and password.');
      return;
    }

    if (mode === 'create' && !username.trim()) {
      Alert.alert('Missing username', 'Add the name people will see.');
      return;
    }

    try {
      setSaving(true);

      if (mode === 'create') {
        await createUser({
          user_id: userId.trim(),
          username: username.trim(),
          password,
        });
      } else {
        await loginUser({
          user_id: userId.trim(),
          password,
        });
      }

      router.replace('/(tabs)');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not continue.';
      Alert.alert(mode === 'create' ? 'Create account failed' : 'Login failed', message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.brand}>GO</Text>
          <Text style={styles.brandSub}>DISCOVER</Text>
        </View>

        <View style={styles.logoDot}>
          <Ionicons name="sparkles-outline" size={26} color="#FFFFFF" />
        </View>
      </View>

      <Text style={styles.title}>
        Got <Text style={styles.titleAccent}>time?</Text>
      </Text>
      <Text style={styles.subtitle}>Login with a User ID to post, meet, and join campus plans.</Text>

      <View style={styles.modeRow}>
        <Pressable
          onPress={() => setMode('login')}
          style={[styles.modeButton, mode === 'login' && styles.modeButtonSelected]}
        >
          <Text style={[styles.modeText, mode === 'login' && styles.modeTextSelected]}>Login</Text>
        </Pressable>

        <Pressable
          onPress={() => setMode('create')}
          style={[styles.modeButton, mode === 'create' && styles.modeButtonSelected]}
        >
          <Text style={[styles.modeText, mode === 'create' && styles.modeTextSelected]}>Create account</Text>
        </Pressable>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>User ID</Text>
        <TextInput
          value={userId}
          onChangeText={setUserId}
          autoCapitalize="none"
          placeholder="example: rojan-txst"
          placeholderTextColor="#94A3B8"
          style={styles.input}
        />

        {mode === 'create' && (
          <>
            <Text style={styles.label}>Username</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Name people see"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
          </>
        )}

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="At least 4 characters"
          placeholderTextColor="#94A3B8"
          style={styles.input}
        />

        <Pressable
          onPress={handleAuth}
          disabled={saving}
          style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
        >
          <Text style={styles.primaryButtonText}>
            {saving ? 'Working...' : mode === 'create' ? 'Create account' : 'Login'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#BFF7FA', paddingHorizontal: 22, paddingTop: 72 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: '#071C4D', fontSize: 48, lineHeight: 46, fontWeight: '900' },
  brandSub: { marginTop: -2, color: '#071C4D', fontSize: 15, fontWeight: '900', letterSpacing: 1.7 },
  logoDot: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#03A63C', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF' },
  title: { marginTop: 38, color: '#071C4D', fontSize: 42, fontWeight: '900' },
  titleAccent: { color: '#04924A' },
  subtitle: { marginTop: 8, color: '#071C4D', fontSize: 18, lineHeight: 25, fontWeight: '700' },
  modeRow: { marginTop: 26, flexDirection: 'row', gap: 10 },
  modeButton: { flex: 1, minHeight: 50, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.72)', alignItems: 'center', justifyContent: 'center' },
  modeButtonSelected: { backgroundColor: '#42F27A' },
  modeText: { color: '#071C4D', fontSize: 15, fontWeight: '900' },
  modeTextSelected: { color: '#001B35' },
  formCard: { marginTop: 18, borderRadius: 24, backgroundColor: '#FFFFFF', padding: 18 },
  label: { marginTop: 12, color: '#071C4D', fontSize: 14, fontWeight: '900' },
  input: { marginTop: 8, borderRadius: 18, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#DDEAF2', paddingHorizontal: 16, paddingVertical: 15, color: '#071C4D', fontSize: 16, fontWeight: '700' },
  primaryButton: { marginTop: 20, borderRadius: 22, backgroundColor: '#03A63C', paddingVertical: 16, alignItems: 'center' },
  primaryButtonDisabled: { opacity: 0.65 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
});
