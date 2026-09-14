import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { saveAvailability } from '../../services/api';

const periods = ['Now', 'Tonight', 'This Weekend'];

export default function AvailableScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState('Tonight');
  const [saved, setSaved] = useState(false);

async function handleSaveAvailability() {
  try {
    await saveAvailability(selectedPeriod);
  
    setSaved(true);
  
    Alert.alert(
      'Availability saved',
      `You are available ${selectedPeriod}.`
    );
  } catch (error) {
    Alert.alert(
      'Connection error',
      'GO College could not reach the backend.'
    );
   }
}

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>YOUR AVAILABILITY</Text>

      <Text style={styles.title}>When are you free?</Text>

      <Text style={styles.subtitle}>
        Pick a time so GO College can match you with people and plans.
      </Text>

      <View style={styles.options}>
        {periods.map((period) => {
          const selected = selectedPeriod === period;

          return (
            <Pressable
              key={period}
              onPress={() => {
                setSelectedPeriod(period);
                setSaved(false);
              }}
              style={[
                styles.option,
                selected && styles.optionSelected,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  selected && styles.optionTextSelected,
                ]}
              >
                {period}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={styles.saveButton}
        onPress={handleSaveAvailability}
      >
        <Text style={styles.saveButtonText}>
          Save availability
        </Text>
      </Pressable>

      {saved && (
        <Text style={styles.savedText}>
          ✓ Available {selectedPeriod}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAF8',
    paddingHorizontal: 24,
    paddingTop: 80,
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16A34A',
    letterSpacing: 1.5,
  },

  title: {
    marginTop: 8,
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
  },

  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 23,
    color: '#64748B',
  },

  options: {
    marginTop: 32,
    gap: 14,
  },

  option: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  optionSelected: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },

  optionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
  },

  optionTextSelected: {
    color: '#15803D',
  },

  saveButton: {
    marginTop: 34,
    backgroundColor: '#2563EB',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  savedText: {
    marginTop: 18,
    textAlign: 'center',
    color: '#16A34A',
    fontSize: 15,
    fontWeight: '700',
  },
});
