import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Pressable, useWindowDimensions, Platform } from 'react-native';
import { useLoan } from '../../contexts/LoanContext';

const statuses = ['Pending', 'Approved', 'Declined'];
const BREAKPOINT_MOBILE = 600;
const BREAKPOINT_TABLET = 1024;

export default function TotalLoanListScreen({ navigation, route }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Pending');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { loans, fetchClients, notifications } = useLoan();

  const refreshAllLoans = async () => {
    setIsRefreshing(true);
    try {
      // Use fetchClients to get full client data with hasPendingApplication flags
      // This is the same method OpsPendingList uses - ensures consistency
      await fetchClients();
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
    // PRIORITY 1: If client has a pending application, show new application message
    if (item.hasPendingApplication && item.latestApplicationDate) {
      const formattedDate = formatDate(item.latestApplicationDate);
      return `Application submitted (${formattedDate})`;
    }
    
    // PRIORITY 2: Check current status for non-pending items
    const currentStatus = item.status ? item.status.toLowerCase() : 'pending';
    
    // For pending status without pending application, return blank
    if (currentStatus === 'pending' || !item.status) {
      return '';
    }
    
    // PRIORITY 3: Find most recent notification for this client's loan from ops manager
    const clientNotifications = notifications
      .filter(n => n.cid === item.cid &&
                  (n.type === 'status_change' || n.type === 'amount_change'))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // If we have notifications from ops manager, use those for formatting
    if (clientNotifications.length > 0) {
      const latestNotification = clientNotifications[0];
      const formattedDate = formatDate(latestNotification.timestamp);
      
      if (currentStatus === 'approved') {
        // Check if there was an actual amount change by comparing original vs approved amount
        // Look for the latest loan in loan history to get original and approved amounts
        if (item.loans?.loanHistory && item.loans.loanHistory.length > 0) {
          const latestLoan = item.loans.loanHistory[item.loans.loanHistory.length - 1];
          const originalAmount = parseInt(latestLoan.amount) || 0;
          
          // Try to find approved amount from notifications or use original amount as fallback
          let approvedAmount = originalAmount;
          const approvalNotification = clientNotifications.find(n => n.type === 'status_change' && n.status === 'Approved');
          if (approvalNotification && approvalNotification.approvedAmount) {
            approvedAmount = parseInt(approvalNotification.approvedAmount) || originalAmount;
          }
          
          // Only show "Amount Edited" if amounts actually differ
          if (originalAmount !== approvedAmount) {
            return `Approved and Amount Edited by OM (${formattedDate})`;
          } else {
            return `Approved by OM (${formattedDate})`;
          }
        } else {
          return `Approved by OM (${formattedDate})`;
        }
      } else if (currentStatus === 'declined') {
        return `Declined by OM (${formattedDate})`;
      }
    }
    
    // PRIORITY 4: Fall back to loan history if no ops manager notifications
    if (item.loans?.loanHistory && item.loans.loanHistory.length > 0) {
      const sortedHistory = [...item.loans.loanHistory].sort((a, b) =>
        new Date(b.dateUpdated || b.dateApplied) - new Date(a.dateUpdated || a.dateApplied)
      );
      
      const latest = sortedHistory[0];
      const date = latest.dateUpdated || latest.dateApplied;
      const formattedDate = formatDate(date);
      
      if (currentStatus === 'approved') {
        return `Approved by OM (${formattedDate})`;
      } else if (currentStatus === 'declined') {
        return `Declined by OM (${formattedDate})`;
      }
    }
    
    return '';
  };

  const filteredLoans = loans.filter((loan) => {
    const matchesSearch =
      loan.name.toLowerCase().includes(search.toLowerCase()) ||
      loan.cid.includes(search);

    const currentStatus = loan.status ? loan.status.toLowerCase() : 'pending';
    const currentFilter = filter.toLowerCase();

    let matchesFilter;
    
    if (currentFilter === 'pending') {
      // For pending filter: show clients with pending applications OR no status (which means pending)
      // EXCLUDE clients with outstanding balances from pending (they can't apply for new loans)
      const hasOutstandingBalance = loan.loanBalance && loan.loanBalance.amount > 0;
      if (hasOutstandingBalance) {
        return false; // Don't show clients with outstanding balances in pending filter
      }
      matchesFilter = loan.hasPendingApplication === true || (!loan.status);
    } else if (currentFilter === 'approved') {
      // For approved filter: show only clients with status "approved" AND no pending application
      // INCLUDE approved clients even if they have outstanding balances
      matchesFilter = currentStatus === 'approved' && loan.hasPendingApplication !== true;
    } else if (currentFilter === 'declined') {
      // For declined filter: show only clients with status "declined" AND no pending application
      // INCLUDE declined clients even if they have outstanding balances
      matchesFilter = currentStatus === 'declined' && loan.hasPendingApplication !== true;
    } else {
      // Fallback for other filters
      matchesFilter = currentStatus === currentFilter;
    }

    return matchesSearch && matchesFilter;
  });

  const { width } = useWindowDimensions();
  const isMobile = width < BREAKPOINT_MOBILE;
  const isTablet = width >= BREAKPOINT_MOBILE && width < BREAKPOINT_TABLET;

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.row,
        isMobile && styles.rowMobile,
        isTablet && styles.rowTablet
      ]}
      onPress={() => isMobile && navigation.navigate('PendingLoanDetail', {
        client: item,
        backScreen: 'TotalLoanList'
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
              (item.status && item.status.toLowerCase() === 'approved' && !item.hasPendingApplication) && styles.approvedStatus,
              (item.status && item.status.toLowerCase() === 'declined' && !item.hasPendingApplication) && styles.declinedStatus,
              (!item.status || item.status.toLowerCase() === 'pending' || item.hasPendingApplication) && styles.pendingStatus
            ]}>
              Status: {item.hasPendingApplication ? 'Pending' : (item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase() : 'Pending')}
            </Text>
            <Text style={styles.mobileDate}>Loan Update: {getLatestLoanRequest(item)}</Text>
          </View>
        </View>
      ) : (
        // Desktop/Tablet layout
        <>
          <View style={[styles.cellContainer, isTablet ? styles.tabletCell : { flex: 1 }, styles.cidCell]}>
            <Text style={styles.cell} numberOfLines={1}>{item.cid}</Text>
          </View>
          <View style={[styles.cellContainer, isTablet ? styles.tabletCell : { flex: 3 }, styles.nameCell]}>
            <Text style={styles.cell} numberOfLines={1}>{item.name}</Text>
          </View>
          <View style={[styles.cellContainer, isTablet ? styles.tabletCell : { flex: 2 }, styles.statusCell]}>
            <Text style={[
              styles.cell,
              styles.centerText,
              (item.status && item.status.toLowerCase() === 'approved' && !item.hasPendingApplication) && styles.approvedStatus,
              (item.status && item.status.toLowerCase() === 'declined' && !item.hasPendingApplication) && styles.declinedStatus,
              (!item.status || item.status.toLowerCase() === 'pending' || item.hasPendingApplication) && styles.pendingStatus
            ]} numberOfLines={1}>
              {item.hasPendingApplication ? 'Pending' : (item.status ?
                item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase()
                : 'Pending')}
            </Text>
          </View>
          <View style={[styles.cellContainer, isTablet ? styles.tabletCell : { flex: 2 }, styles.updateCell]}>
            <Text style={[styles.cell, isTablet && styles.tabletUpdateText]}>{getLatestLoanRequest(item)}</Text>
          </View>
          <View style={[styles.cellContainer, isTablet ? styles.tabletCell : { flex: 1 }, styles.actionCell]}>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => navigation.navigate('PendingLoanDetail', {
                client: item,
                backScreen: 'TotalLoanList'
              })}
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
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <Text style={[styles.title, isMobile && styles.titleMobile]}>Total Loan List</Text>
        <TouchableOpacity
          style={[styles.dashboardBtn, isMobile && styles.dashboardBtnMobile]}
          onPress={() => navigation.navigate('LoanOfficerDashboard')}
        >
          <Text style={[styles.btnText, isMobile && styles.btnTextMobile]}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>

      {/* Search + Filter */}
      <View style={[styles.searchFilterRow, isMobile && styles.searchFilterRowMobile]}>
        <TextInput
          style={[styles.searchInput, isMobile && styles.searchInputMobile]}
          placeholder="Search by name or CID"
          value={search}
          onChangeText={setSearch}
        />

        <View style={[styles.filter, isMobile && styles.filterMobile]}>
          <Text style={[styles.filterLabel, isMobile && styles.filterLabelMobile]}>Filter:</Text>
          {statuses.map((status) => (
            <Pressable
              key={status}
              style={[
                styles.filterOption,
                filter === status && styles.activeFilter,
                isMobile && styles.filterOptionMobile
              ]}
              onPress={() => setFilter(status)}
            >
              <Text style={[
                styles.filterText,
                filter === status && styles.activeFilterText,
                isMobile && styles.filterTextMobile
              ]}>{status}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Table Headers - Only show on desktop/tablet */}
      {!isMobile && (
        <View style={styles.tableHeader}>
          <View style={[styles.headerContainer, isTablet ? styles.tabletCell : { flex: 1 }, styles.cidCell]}>
            <Text style={[styles.headerCell, isTablet && styles.tabletHeaderText]}>CID</Text>
          </View>
          <View style={[styles.headerContainer, isTablet ? styles.tabletCell : { flex: 3 }, styles.nameCell]}>
            <Text style={[styles.headerCell, isTablet && styles.tabletHeaderText]}>Full Name</Text>
          </View>
          <View style={[styles.headerContainer, isTablet ? styles.tabletCell : { flex: 2 }, styles.statusCell]}>
            <Text style={[styles.headerCell, styles.centerText, isTablet && styles.tabletHeaderText]}>Loan Status</Text>
          </View>
          <View style={[styles.headerContainer, isTablet ? styles.tabletCell : { flex: 2 }, styles.updateCell]}>
            <Text style={[styles.headerCell, isTablet && styles.tabletHeaderText]}>Loan Update</Text>
          </View>
          <View style={[styles.headerContainer, isTablet ? styles.tabletCell : { flex: 1 }, styles.actionCell]}>
            <Text style={[styles.headerCell, isTablet && styles.tabletHeaderText]}></Text>
          </View>
        </View>
      )}

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
  // Tablet specific styles
  rowTablet: {
    paddingVertical: 16,
  },
  tabletCell: {
    paddingHorizontal: 8,
  },
  tabletUpdateText: {
    fontSize: 13,
    lineHeight: 18,
    flexWrap: 'wrap',
    textAlign: 'left',
    paddingRight: 4,
    width: '100%',
  },
  // Cell width styles
  cidCell: {
    width: '15%',
  },
  nameCell: {
    width: '25%',
  },
  statusCell: {
    width: '15%',
  },
  updateCell: {
    width: '35%',
    paddingRight: 12,
  },
  actionCell: {
    width: '10%',
    alignItems: 'center',
  },
  // Mobile specific styles
  headerMobile: {
    flexDirection: 'column',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleMobile: {
    fontSize: 18,
  },
  dashboardBtnMobile: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  btnTextMobile: {
    fontSize: 14,
  },
  searchFilterRowMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  searchInputMobile: {
    minWidth: '100%',
    padding: 8,
    fontSize: 14,
  },
  filterMobile: {
    flexWrap: 'wrap',
    gap: 8,
  },
  filterLabelMobile: {
    fontSize: 14,
  },
  filterOptionMobile: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  filterTextMobile: {
    fontSize: 12,
  },
  rowMobile: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
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
    flexDirection: 'column',
    gap: 8,
  },
  mobileStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  mobileDate: {
    fontSize: 12,
    color: '#6c757d',
    flexWrap: 'wrap',
  },
  viewBtnText: {
    color: '#495057',
    fontSize: 14,
    fontWeight: '500',
  },
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
    padding: Platform.select({ web: 20, default: 16 }),
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