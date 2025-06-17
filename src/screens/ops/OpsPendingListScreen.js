import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useLoan } from '../../contexts/LoanContext';

export default function OpsPendingListScreen({ navigation }) {
  const { loans } = useLoan();
  const [search, setSearch] = useState('');

  const filtered = loans.filter(
    item =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.cid.includes(search)
  );

  const getLatestLoanRequest = (item) => {
    if (item.loans?.loanHistory && item.loans.loanHistory.length > 0) {
      const latest = [...item.loans.loanHistory].sort((a, b) => 
        new Date(b.dateApplied) - new Date(a.dateApplied)
      )[0];
      return latest.dateApplied;
    }
    return 'No date';
  };

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <Text style={[styles.cell, { flex: 1, textAlign: 'center' }]}>{item.cid}</Text>
      <Text style={[styles.cell, { flex: 3, textAlign: 'center' }]}>{item.name}</Text>
      <Text style={[
        styles.cell,
        { flex: 2, textAlign: 'center' },
        (item.status && item.status.toLowerCase() === 'approved') && styles.approvedStatus,
        (item.status && item.status.toLowerCase() === 'declined') && styles.declinedStatus,
        (!item.status || item.status.toLowerCase() === 'pending') && styles.pendingStatus
      ]}>
        {item.status ?
          item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase()
          : 'Pending'}
      </Text>
      <Text style={[styles.cell, { flex: 3, textAlign: 'center' }]}>{getLatestLoanRequest(item)}</Text>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => {
            navigation.navigate('OpsPendingLoanDetail', {
              client: item,
              backScreen: 'OpsPendingList'
            });
          }}
        >
          <Text>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>List of Pending Loan Approval</Text>
        <TouchableOpacity
          style={styles.dashboardBtn}
          onPress={() => navigation.replace('OpsDashboard')}
        >
          <Text style={styles.btnText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Table Header */}
     <View style={styles.tableHeader}>
       <Text style={[styles.headerCell, { flex: 1, textAlign: 'center' }]}>CID</Text>
       <Text style={[styles.headerCell, { flex: 3, textAlign: 'center' }]}>Full Name</Text>
       <Text style={[styles.headerCell, { flex: 2, textAlign: 'center' }]}>Loan Status</Text>
       <Text style={[styles.headerCell, { flex: 3, textAlign: 'center' }]}>Date Applied</Text>
       <Text style={[styles.headerCell, { flex: 1 }]}></Text>
     </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.cid}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    fontSize: 14,
    paddingHorizontal: 10,
  },
  approvedStatus: {
    color: '#2ecc71',
    fontWeight: 'bold',
  },
  pendingStatus: {
    color: '#000000',
    fontWeight: 'bold',
  },
  declinedStatus: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  container: {
    padding: 20,
    backgroundColor: '#f6f6f6',
    flex: 1,
  },
  headerRow: {
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
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#dcdcdc',
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  headerCell: {
    fontWeight: 'bold',
    fontSize: 15,
    paddingHorizontal: 10,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
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
