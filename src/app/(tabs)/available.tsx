import { StyleSheet, Text, View } from 'react-native';

export default function AvailableScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Available</Text>
      <Text style={styles.subtitle}>Tell campus when you're free.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAF8',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#64748B',
  },
});
