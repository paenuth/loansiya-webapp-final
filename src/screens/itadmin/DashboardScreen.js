import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { UsersContext } from '../../contexts/UsersContext';
import TopBar from '../../components/common/TopBar';
import DashboardCard from '../../components/common/DashboardCard';

export default function DashboardScreen({ navigation }) {
  const { users } = useContext(UsersContext);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  const officerCount = users.filter(user =>
    (user.roleType === 'LOAN_OFFICER' || user.role === 'Loan Officer') && user.status === 'Active'
  ).length;
  
  const opsCount = users.filter(user =>
    (user.roleType === 'OPS_MANAGER' || user.role === 'OPS_MANAGER') && user.status === 'Active'
  ).length;

  return (
    <View style={styles.container}>
      <TopBar
        navigation={navigation}
        role="IT Admin"
        showNotifications={false}
      />

      <View style={styles.content}>
        <View style={[styles.cardRow, isMobile && styles.cardRowMobile]}>
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
          style={[styles.viewListButton, isMobile && styles.viewListButtonMobile]}
          onPress={() => navigation.navigate('UserManagement')}
        >
          <Text style={[styles.buttonText, isMobile && styles.buttonTextMobile]}>View List</Text>
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
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  cardRowMobile: {
    flexDirection: 'column',
    gap: 15,
    alignItems: 'center',
  },
  viewListButton: {
    backgroundColor: '#0066ff',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginTop: 20,
    minWidth: 200,
  },
  viewListButtonMobile: {
    paddingVertical: 14,
    paddingHorizontal: 30,
    marginTop: 25,
    width: '80%',
    maxWidth: 300,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  buttonTextMobile: {
    fontSize: 15,
  },
});