import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useLoan } from '../../contexts/LoanContext';

export default function LoanHistoryScreen({ route, navigation }) {
  const [search, setSearch] = useState('');
  const clientId = route.params?.clientId;
  const userRole = route.params?.userRole; // 'ops' or 'loanofficer'
  const { loans } = useLoan();

  // Find client's loan history
  const client = loans.find(loan => loan.cid === clientId);
  const loanHistory = client?.loans?.loanHistory || [];

  const filteredData = loanHistory.filter(
    item =>
      item.dateApplied.toLowerCase().includes(search.toLowerCase()) ||
      item.purpose.toLowerCase().includes(search.toLowerCase()) ||
      item.status.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }) => {
    const isApproved = item.status === 'Approved';
    const isDeclined = item.status === 'Declined';

    return (
      <View style={styles.row}>
        <Text style={[styles.cell, { flex: 2 }]}>{item.dateApplied}</Text>
        <Text style={[styles.cell, { flex: 2 }]}>₱{item.amount.toLocaleString()}</Text>
        <Text style={[styles.cell, { flex: 3 }]}>{item.purpose}</Text>
        <Text
          style={[
            styles.cell,
            { flex: 2, color: isApproved ? 'green' : isDeclined ? 'red' : 'black' },
          ]}
        >
          {item.status}
        </Text>
        <Text style={[styles.cell, { flex: 2 }]}>{item.dueDate || 'N/A'}</Text>
        <Text style={[styles.cell, { flex: 1 }]}>{item.paid ? 'Yes' : 'No'}</Text>
      </View>
    );
  };

  // Role-based dashboard navigation
  const handleDashboardNav = () => {
    const dashboardScreen = userRole === 'ops' ? 'OpsDashboard' : 'LoanOfficerDashboard';
    navigation.navigate(dashboardScreen);
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Loan History of Client {clientId}</Text>
        <TouchableOpacity
          style={styles.dashboardBtn}
          onPress={handleDashboardNav}
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
        <Text style={[styles.headerCell, { flex: 2 }]}>Date Applied</Text>
        <Text style={[styles.headerCell, { flex: 2 }]}>Amount</Text>
        <Text style={[styles.headerCell, { flex: 3 }]}>Purpose</Text>
        <Text style={[styles.headerCell, { flex: 2 }]}>Status</Text>
        <Text style={[styles.headerCell, { flex: 2 }]}>Due Date</Text>
        <Text style={[styles.headerCell, { flex: 1 }]}>Paid?</Text>
      </View>

      {/* Loan List */}
      <FlatList
        data={filteredData}
        keyExtractor={(item, index) => index.toString()}
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  dashboardBtn: {
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchBar: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#ddd',
    borderRadius: 6,
    padding: 10,
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
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  cell: {
    fontSize: 13,
    paddingHorizontal: 6,
  },
  separator: {
    height: 1,
    backgroundColor: '#ddd',
  },
});