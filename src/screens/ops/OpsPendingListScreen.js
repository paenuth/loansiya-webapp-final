import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { useLoan } from '../../contexts/LoanContext';

export default function OpsPendingListScreen({ navigation }) {
  const { loans, fetchClients } = useLoan();
  const [search, setSearch] = useState('');
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Refresh client data when component mounts or when returning from approval/decline
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('OpsPendingListScreen focused, refreshing client data...');
      fetchClients();
    });

    return unsubscribe;
  }, [navigation, fetchClients]);

  // Filter for clients with pending loan applications based on GCS data
  const pendingLoans = loans.filter(item => {
    // Use the hasPendingApplication flag from the backend
    // This flag checks if there's a loan-application.json file in GCS
    // that hasn't been processed (no corresponding file in clients-approved or clients-declined)
    return item.hasPendingApplication === true;
  });

  const filtered = pendingLoans.filter(
    item =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.cid.includes(search)
  );

  const getLatestLoanRequest = (item) => {
    // For pending applications, use the actual GCS folder date (latest application date)
    if (item.hasPendingApplication && item.latestApplicationDate) {
      // Convert YYYY-MM-DD format to a more readable format
      const date = new Date(item.latestApplicationDate);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: '2-digit'
      });
    }
    
    // Fallback to loan history if no pending application date
    if (item.loans?.loanHistory && item.loans.loanHistory.length > 0) {
      const latest = [...item.loans.loanHistory].sort((a, b) =>
        new Date(b.dateApplied) - new Date(a.dateApplied)
      )[0];
      return latest.dateApplied;
    }
    
    return 'No date';
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.row, isMobile && styles.rowMobile]}
      onPress={() => isMobile && navigation.navigate('OpsPendingLoanDetail', {
        client: item,
        backScreen: 'OpsPendingList'
      })}
    >
      {isMobile ? (
        // Mobile layout
        <View style={styles.mobileContent}>
          <Text style={styles.mobileName}>{item.name}</Text>
          <Text style={styles.mobileCid}>CID: {item.cid}</Text>
          <View style={styles.mobileStatusRow}>
            <Text style={[
              styles.mobileStatus,
              styles.pendingStatus  // Always show pending style for items in pending list
            ]}>
              Pending
            </Text>
            <Text style={styles.mobileDate}>{getLatestLoanRequest(item)}</Text>
          </View>
        </View>
      ) : (
        // Desktop layout
        <>
          <Text style={[styles.cell, { flex: 1, textAlign: 'center' }]}>{item.cid}</Text>
          <Text style={[styles.cell, { flex: 3, textAlign: 'center' }]}>{item.name}</Text>
          <Text style={[
            styles.cell,
            { flex: 2, textAlign: 'center' },
            styles.pendingStatus  // Always show pending style for items in pending list
          ]}>
            Pending
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
              <Text style={styles.viewBtnText}>View</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <Text style={[styles.title, isMobile && styles.titleMobile]}>
          List of Pending Loan Approval
        </Text>
        <TouchableOpacity
          style={[styles.dashboardBtn, isMobile && styles.dashboardBtnMobile]}
          onPress={() => navigation.replace('OpsDashboard')}
        >
          <Text style={[styles.btnText, isMobile && styles.btnTextMobile]}>
            Go to Dashboard
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, isMobile && styles.searchBarMobile]}>
        <TextInput
          style={[styles.searchInput, isMobile && styles.searchInputMobile]}
          placeholder="Search by name or CID"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Table Header - Only show on desktop */}
      {!isMobile && (
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, { flex: 1, textAlign: 'center' }]}>CID</Text>
          <Text style={[styles.headerCell, { flex: 3, textAlign: 'center' }]}>Full Name</Text>
          <Text style={[styles.headerCell, { flex: 2, textAlign: 'center' }]}>Loan Status</Text>
          <Text style={[styles.headerCell, { flex: 3, textAlign: 'center' }]}>Date Applied</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}></Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.cid}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Platform.select({ web: 20, default: 16 }),
    backgroundColor: '#f6f6f6',
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.select({ web: 20, default: 16 }),
  },
  headerRowMobile: {
    marginBottom: 12,
  },
  title: {
    fontSize: Platform.select({ web: 22, default: 20 }),
    fontWeight: 'bold',
  },
  titleMobile: {
    fontSize: 18,
  },
  dashboardBtn: {
    backgroundColor: '#007bff',
    paddingVertical: Platform.select({ web: 10, default: 8 }),
    paddingHorizontal: Platform.select({ web: 16, default: 12 }),
    borderRadius: 8,
  },
  dashboardBtnMobile: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: Platform.select({ web: 16, default: 14 }),
  },
  btnTextMobile: {
    fontSize: 12,
  },
  searchBar: {
    flexDirection: 'row',
    marginBottom: Platform.select({ web: 16, default: 12 }),
  },
  searchBarMobile: {
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: Platform.select({ web: 12, default: 10 }),
    flex: 1,
    fontSize: Platform.select({ web: 16, default: 14 }),
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchInputMobile: {
    padding: 8,
    fontSize: 14,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e9ecef',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 4,
    borderRadius: 8,
  },
  headerCell: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#495057',
  },
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: Platform.select({ web: 12, default: 10 }),
    paddingHorizontal: Platform.select({ web: 8, default: 6 }),
    marginBottom: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  rowMobile: {
    padding: 12,
  },
  cell: {
    fontSize: Platform.select({ web: 16, default: 14 }),
    paddingHorizontal: 6,
    color: '#212529',
  },
  mobileContent: {
    flex: 1,
  },
  mobileName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: '#212529',
  },
  mobileCid: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 6,
  },
  mobileStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  mobileDate: {
    fontSize: 12,
    color: '#6c757d',
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
  viewBtn: {
    backgroundColor: '#e9ecef',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  viewBtnText: {
    color: '#495057',
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    flexGrow: 1,
  }
});
