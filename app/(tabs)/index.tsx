import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>VELYQO</Text>

      <Text style={styles.tagline}>
        Engineer Your Future
      </Text>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  logo: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 3,
  },

  tagline: {
    color: '#A78BFA',
    fontSize: 18,
    marginTop: 12,
    marginBottom: 50,
  },

  button: {
    backgroundColor: '#7C3AED',
    width: '100%',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  secondaryButton: {
    width: '100%',
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
  },

  secondaryText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
