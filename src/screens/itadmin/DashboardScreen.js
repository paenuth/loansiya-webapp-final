import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { UsersContext } from '../../contexts/UsersContext';
import TopBar from '../../components/common/TopBar';
import DashboardCard from '../../components/common/DashboardCard';

export default function DashboardScreen({ navigation }) {
  const { users } = useContext(UsersContext);
  
  const officerCount = users.filter(user =>
    user.role === 'Officer' && user.status === 'Active'
  ).length;
  
  const opsCount = users.filter(user =>
    user.role === 'Ops' && user.status === 'Active'
  ).length;

  return (
    <View style={styles.container}>
      <TopBar
        navigation={navigation}
        role="IT Admin"
        showNotifications={false}
      />

      <View style={styles.content}>
        <View style={styles.cardRow}>
          <DashboardCard
            label="Total Active Loan Officers"
            value={officerCount}
          />
          <DashboardCard
            label="Total Active Operations Manager"
            value={opsCount}
          />
        </View>
        <TouchableOpacity
          style={styles.viewListButton}
          onPress={() => navigation.navigate('UserManagement')}
        >
          <Text style={styles.buttonText}>View List</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  viewListButton: {
    backgroundColor: '#0066ff',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});