import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function DashboardCard({ label, value, onPress }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.number}>{value}</Text>
      {onPress && (
        <TouchableOpacity style={styles.button} onPress={onPress}>
          <Text style={styles.buttonText}>View List</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#e2e2e2',
    paddingVertical: 30,
    paddingHorizontal: 25,
    borderRadius: 12,
    width: 180,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  number: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#0066ff',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});