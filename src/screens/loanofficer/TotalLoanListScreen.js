import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { useLoan } from '../../contexts/LoanContext';

const statuses = ['Pending', 'Approved', 'Declined'];

export default function TotalLoanListScreen({ navigation, route }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Pending');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { loans, refreshClientData, notifications } = useLoan();

  const refreshAllLoans = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all(loans.map(loan => refreshClientData(loan.cid)));
    } catch (err) {
      console.error('Error refreshing loans:', err);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Refresh loans list when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', refreshAllLoans);
    return unsubscribe;
  }, [navigation, loans]);

  // Initial data load
  useEffect(() => {
    refreshAllLoans();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const getLatestLoanRequest = (item) => {
    // Find most recent notification for this client's loan from ops manager
    const clientNotifications = notifications
      .filter(n => n.cid === item.cid &&
                  (n.type === 'status_change' || n.type === 'amount_change'))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // If we have a notification from ops manager, use that
    if (clientNotifications.length > 0) {
      const latestNotification = clientNotifications[0];
      const formattedDate = formatDate(latestNotification.timestamp);
      return `${formattedDate} (${latestNotification.status || 'Amount updated'} by Ops Manager)`;
    }
    
    // Fall back to loan history if no ops manager notifications
    if (item.loans?.loanHistory && item.loans.loanHistory.length > 0) {
      const sortedHistory = [...item.loans.loanHistory].sort((a, b) =>
        new Date(b.dateUpdated || b.dateApplied) - new Date(a.dateUpdated || a.dateApplied)
      );
      
      const latest = sortedHistory[0];
      const date = latest.dateUpdated || latest.dateApplied;
      const formattedDate = formatDate(date);
      const action = latest.status ? ` (${latest.status})` : '';
      return `${formattedDate}${action}`;
    }
    
    return 'No date';
  };

  const filteredLoans = loans.filter((loan) => {
    const matchesSearch =
      loan.name.toLowerCase().includes(search.toLowerCase()) ||
      loan.cid.includes(search);

    const currentStatus = loan.status ? loan.status.toLowerCase() : 'pending';
    const currentFilter = filter.toLowerCase();

    const matchesFilter =
      (currentFilter === 'pending' && (!loan.status || currentStatus === 'pending')) ||
      (currentStatus === currentFilter);

    return matchesSearch && matchesFilter;
  });

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <View style={[styles.cellContainer, { flex: 1 }]}>
        <Text style={styles.cell} numberOfLines={1}>{item.cid}</Text>
      </View>
      <View style={[styles.cellContainer, { flex: 3 }]}>
        <Text style={styles.cell} numberOfLines={1}>{item.name}</Text>
      </View>
      <View style={[styles.cellContainer, { flex: 2 }]}>
        <Text style={[
          styles.cell,
          styles.centerText,
          (item.status && item.status.toLowerCase() === 'approved') && styles.approvedStatus,
          (item.status && item.status.toLowerCase() === 'declined') && styles.declinedStatus,
          (!item.status || item.status.toLowerCase() === 'pending') && styles.pendingStatus
        ]} numberOfLines={1}>
          {item.status ?
            item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase()
            : 'Pending'}
        </Text>
      </View>
      <View style={[styles.cellContainer, { flex: 2 }]}>
        <Text style={styles.cell} numberOfLines={2}>{getLatestLoanRequest(item)}</Text>
      </View>
      <View style={[styles.cellContainer, { flex: 1, alignItems: 'center' }]}>
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => navigation.navigate('PendingLoanDetail', {
            client: item,
            backScreen: 'TotalLoanList'
          })}
        >
          <Text>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Total Loan List</Text>
        <TouchableOpacity
          style={styles.dashboardBtn}
          onPress={() => navigation.navigate('LoanOfficerDashboard')}
        >
          <Text style={styles.btnText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>

      {/* Search + Filter */}
      <View style={styles.searchFilterRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.filter}>
          <Text style={styles.filterLabel}>Filter:</Text>
          {statuses.map((status) => (
            <Pressable
              key={status}
              style={[
                styles.filterOption,
                filter === status && styles.activeFilter,
              ]}
              onPress={() => setFilter(status)}
            >
              <Text style={[
                styles.filterText,
                filter === status && styles.activeFilterText
              ]}>{status}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Table Headers */}
      <View style={styles.tableHeader}>
        <View style={[styles.headerContainer, { flex: 1 }]}>
          <Text style={styles.headerCell}>CID</Text>
        </View>
        <View style={[styles.headerContainer, { flex: 3 }]}>
          <Text style={styles.headerCell}>Full Name</Text>
        </View>
        <View style={[styles.headerContainer, { flex: 2 }]}>
          <Text style={[styles.headerCell, styles.centerText]}>Loan Status</Text>
        </View>
        <View style={[styles.headerContainer, { flex: 2 }]}>
          <Text style={styles.headerCell}>Latest Update</Text>
        </View>
        <View style={[styles.headerContainer, { flex: 1 }]}>
          <Text style={styles.headerCell}></Text>
        </View>
      </View>

      {/* List */}
      {isRefreshing && (
        <View style={styles.refreshingIndicator}>
          <Text style={styles.refreshingText}>Refreshing loan data...</Text>
        </View>
      )}
      <FlatList
        data={filteredLoans}
        keyExtractor={(item) => item.cid}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cellContainer: {
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerText: {
    textAlign: 'center',
    width: '100%',
  },
  container: {
    padding: 20,
    backgroundColor: '#f6f6f6',
    flex: 1,
  },
  approvedStatus: {
    color: '#2ecc71', // Green color for approved
    fontWeight: 'bold'
  },
  pendingStatus: {
    color: '#000000', // Black color for pending
    fontWeight: 'bold'
  },
  declinedStatus: {
    color: '#e74c3c', // Red color for declined
    fontWeight: 'bold'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  dashboardBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  searchInput: {
    backgroundColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    flex: 1,
    minWidth: 150,
  },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterLabel: {
    fontWeight: '600',
  },
  filterOption: {
    backgroundColor: '#eee',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  activeFilter: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    color: '#000',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  refreshingIndicator: {
    padding: 10,
    backgroundColor: '#e8f5e9',
    marginBottom: 10,
  },
  refreshingText: {
    color: '#2ecc71',
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#dcdcdc',
    paddingVertical: 10,
    marginBottom: 4,
    alignItems: 'center',
  },
  headerCell: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    minHeight: 50,
  },
  cell: {
    fontSize: 14,
  },
  viewBtn: {
    backgroundColor: '#ccc',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
});