import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>GO</Text>
      <Text style={styles.title}>College</Text>

      <Text style={styles.subtitle}>
        See who’s free. Find something to do. Go.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAF8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  logo: {
    fontSize: 54,
    fontWeight: '900',
    color: '#16A34A',
    letterSpacing: -3,
  },

  title: {
    fontSize: 38,
    fontWeight: '800',
    color: '#2563EB',
    marginTop: -8,
  },

  subtitle: {
    marginTop: 20,
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
    color: '#475569',
    maxWidth: 300,
  },
});
