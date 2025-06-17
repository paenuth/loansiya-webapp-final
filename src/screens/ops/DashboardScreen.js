import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLoan } from '../../contexts/LoanContext';
import TopBar from '../../components/common/TopBar';
import DashboardCard from '../../components/common/DashboardCard';

export default function OpsDashboardScreen({ navigation }) {
  const { loans } = useLoan();
  
  const totalClients = loans.length;
  const totalPending = loans.filter(loan =>
    loan.status === 'Pending' ||
    !loan.status
  ).length;

  return (
    <View style={styles.container}>
      <TopBar
        navigation={navigation}
        role="Operations Manager"
        showNotifications={false}
      />

      <View style={styles.content}>
        <View style={styles.cardRow}>
          <DashboardCard
            label="Total Loan Clients"
            value={totalClients}
            onPress={() => navigation.navigate('OpsClientList')}
          />
          <DashboardCard
            label="Total Loan Pending"
            value={totalPending}
            onPress={() => navigation.navigate('OpsPendingList')}
          />
        </View>
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
  },
});
