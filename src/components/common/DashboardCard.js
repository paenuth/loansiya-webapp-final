import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

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
    paddingVertical: Platform.select({ web: 30, default: 20 }),
    paddingHorizontal: Platform.select({ web: 25, default: 15 }),
    borderRadius: 12,
    width: Platform.select({ web: 200, default: '45%' }),
    minWidth: Platform.select({ web: 180, default: 150 }),
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  label: {
    fontSize: Platform.select({ web: 16, default: 14 }),
    textAlign: 'center',
    marginBottom: Platform.select({ web: 8, default: 6 }),
    color: '#333',
    fontWeight: '500',
  },
  number: {
    fontSize: Platform.select({ web: 28, default: 24 }),
    fontWeight: 'bold',
    color: '#111',
    marginBottom: Platform.select({ web: 14, default: 10 }),
  },
  button: {
    backgroundColor: '#0066ff',
    paddingVertical: Platform.select({ web: 10, default: 8 }),
    paddingHorizontal: Platform.select({ web: 30, default: 20 }),
    borderRadius: 8,
    width: '90%',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: Platform.select({ web: 16, default: 14 }),
    textAlign: 'center',
  },
});