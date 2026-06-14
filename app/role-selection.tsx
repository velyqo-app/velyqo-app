import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function RoleSelection() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Which best describes you?</Text>

      <TouchableOpacity
        style={styles.option}
        onPress={() => router.push('/name')}
        >
        <Text style={styles.optionText}>🎓 Student / Exploring Careers</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        onPress={() => router.push('/name')}
        >
        <Text style={styles.optionText}>💼 Professional</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        onPress={() => router.push('/name')}
        >
        <Text style={styles.optionText}>🔄 Career Changer</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        onPress={() => router.push('/name')}
        >
        <Text style={styles.optionText}>🤔 Not Sure Yet</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
  },
  option: {
    backgroundColor: '#1E293B',
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});