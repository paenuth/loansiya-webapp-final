import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useLoan } from '../../contexts/LoanContext';

export default function LoanOfficerNotifications({ navigation }) {
  const { notifications, markNotificationsAsRead, loans, refreshClientData } = useLoan();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Mark notifications as read when screen is opened
    markNotificationsAsRead();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('LoanOfficerNotifications focused - refreshing data');
      setIsRefreshing(true);
      
      // Refresh all loans to get latest status
      Promise.all(loans.map(loan => refreshClientData(loan.cid)))
        .catch(err => console.error('Error refreshing client data:', err))
        .finally(() => setIsRefreshing(false));
    });

    return unsubscribe;
  }, [navigation, loans]);
  const renderItem = ({ item }) => {
    const isApproved = item.status === 'Approved';
    
    return (
      <View style={styles.item}>
        {item.type === 'status_change' ? (
          <>
            <Text style={[styles.icon, { color: isApproved ? 'green' : 'red' }]}>
              {isApproved ? '✅' : '❌'}
            </Text>
            <Text style={styles.message}>
              CID <Text style={styles.bold}>{item.cid}</Text> LOAN REQUEST HAS BEEN{' '}
              <Text style={[styles.status, { color: isApproved ? 'green' : 'red' }]}>
                {item.status.toUpperCase()}
              </Text>{' '}
              BY THE OPERATIONAL MANAGER
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.icon, { color: '#007bff' }]}>💰</Text>
            <Text style={styles.message}>
              Loan amount for client{' '}
              <Text style={styles.bold}>{item.clientName}</Text> (CID: {item.cid})
              has been updated to{' '}
              <Text style={styles.bold}>₱{item.amount.toLocaleString()}</Text>
            </Text>
          </>
        )}
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header with Dashboard Button */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>Hello Loan Officer!</Text>
        <TouchableOpacity
          style={styles.dashboardBtn}
          onPress={() => navigation.navigate('LoanOfficerDashboard')}
        >
          <Text style={styles.btnText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>

      {/* Section Title */}
      <Text style={styles.subHeader}>Notifications</Text>

      {/* Notification List */}
      {isRefreshing && (
        <View style={styles.refreshingContainer}>
          <Text style={styles.refreshingText}>Refreshing...</Text>
        </View>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#f6f6f6',
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  dashboardBtn: {
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  subHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  icon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 2,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  bold: {
    fontWeight: 'bold',
  },
  status: {
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  separator: {
    borderBottomWidth: 1,
    borderColor: '#ccc',
    marginVertical: 6,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic'
  },
  refreshingContainer: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  refreshingText: {
    color: '#666',
    fontSize: 14,
  }
});
