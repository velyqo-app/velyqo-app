import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function PurposeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        What would you like Velyqo to help you with?
      </Text>

      <TouchableOpacity style={styles.option}>
        <Text style={styles.optionText}>📈 Advance my career</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.option}>
        <Text style={styles.optionText}>🔄 Change careers</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.option}>
        <Text style={styles.optionText}>🧭 Explore careers</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.option}>
        <Text style={styles.optionText}>💰 Increase my income</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.option}>
        <Text style={styles.optionText}>🚀 Plan my future</Text>
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
    textAlign: 'center',
    marginBottom: 32,
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