import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useLoan } from '../../contexts/LoanContext';
import { calculateDueDate } from '../../utils/dateFormatters';

const BREAKPOINT_TABLET = 768;
export default function LoanHistoryScreen({ route, navigation }) {
  const [search, setSearch] = useState('');
  const [loanTermsData, setLoanTermsData] = useState(null);
  const clientId = route.params?.clientId;
  const userRole = route.params?.userRole; // 'ops' or 'loanofficer'
  const fromPendingDetail = route.params?.fromPendingDetail;
  const { loans } = useLoan();

  // Find client's loan history
  const client = loans.find(loan => loan.cid === clientId);
  const loanHistory = client?.loans?.loanHistory || [];

  // Fetch loan terms data for due date calculation
  useEffect(() => {
    const fetchLoanTerms = async () => {
      if (!clientId) return;
      
      try {
        const response = await fetch(`http://localhost:5600/client-loan-data/${clientId}`);
        if (response.ok) {
          const data = await response.json();
          setLoanTermsData(data);
        }
      } catch (error) {
        console.error('Error fetching loan terms:', error);
      }
    };

    fetchLoanTerms();
  }, [clientId]);

  const filteredData = loanHistory
    .filter(
      item =>
        item.dateApplied.toLowerCase().includes(search.toLowerCase()) ||
        item.purpose.toLowerCase().includes(search.toLowerCase()) ||
        item.status.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      // Convert dateApplied strings to Date objects for proper comparison
      const dateA = new Date(a.dateApplied);
      const dateB = new Date(b.dateApplied);
      // Sort in descending order (latest first)
      return dateB - dateA;
    });

  const { width } = useWindowDimensions();
  const isMobile = width < BREAKPOINT_TABLET;

  const renderItem = ({ item }) => {
    const isApproved = item.status === 'Approved';
    const isDeclined = item.status === 'Declined';
    
    // Calculate due date based on loan terms from API
    let dueDate = item.dueDate || 'N/A';
    
    if (isApproved && loanTermsData) {
      // Use loan terms from API to calculate due date
      dueDate = calculateDueDate(
        item.dateApplied,
        loanTermsData.term,
        loanTermsData.repaymentMethod
      );
    }

    if (isMobile) {
      return (
        <View style={styles.cardContainer}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Date Applied:</Text>
            <Text style={styles.cardValue}>{item.dateApplied}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Amount:</Text>
            <Text style={styles.cardValue}>₱{item.amount.toLocaleString()}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Purpose:</Text>
            <Text style={styles.cardValue}>{item.purpose}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Status:</Text>
            <Text style={[styles.cardValue, { color: isApproved ? 'green' : isDeclined ? 'red' : 'black' }]}>
              {item.status}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Due Date:</Text>
            <Text style={styles.cardValue}>{dueDate}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Paid:</Text>
            <Text style={styles.cardValue}>{item.paid ? 'Yes' : 'No'}</Text>
          </View>
        </View>
      );
    }

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
        <Text style={[styles.cell, { flex: 2 }]}>{dueDate}</Text>
        <Text style={[styles.cell, { flex: 1 }]}>{item.paid ? 'Yes' : 'No'}</Text>
      </View>
    );
  };

  // Role-based navigation functions
  const handleDashboardNav = () => {
    const dashboardScreen = userRole === 'ops' ? 'OpsDashboard' : 'LoanOfficerDashboard';
    navigation.navigate(dashboardScreen);
  };
const handleProfileNav = () => {
  if (fromPendingDetail) {
    navigation.goBack(); // Go back to PendingLoanDetail regardless of role
  } else {
    const profileScreen = userRole === 'ops' ? 'OpsClientProfile' : 'ClientProfile';
    navigation.navigate(profileScreen, {
      client: {
        cid: clientId
      }
    });
  }
};


  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      {/* Top Header */}
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <Text style={[styles.title, isMobile && styles.titleMobile]}>
          Loan History of Client {clientId}
        </Text>
        <View style={[styles.buttonContainer, isMobile && styles.buttonContainerMobile]}>
          <TouchableOpacity
            style={[styles.btn, styles.backBtn, isMobile && styles.btnMobile]}
            onPress={handleProfileNav}
          >
            <Text style={styles.btnText}>Back to Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.dashboardBtn, isMobile && styles.btnMobile]}
            onPress={handleDashboardNav}
          >
            <Text style={styles.btnText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, isMobile && styles.searchBarMobile]}>
        <TextInput
          style={[styles.searchInput, isMobile && styles.searchInputMobile]}
          placeholder="Search"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Table Header - Only show on desktop */}
      {!isMobile && (
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, { flex: 2 }]}>Date Applied</Text>
          <Text style={[styles.headerCell, { flex: 2 }]}>Amount</Text>
          <Text style={[styles.headerCell, { flex: 3 }]}>Purpose</Text>
          <Text style={[styles.headerCell, { flex: 2 }]}>Status</Text>
          <Text style={[styles.headerCell, { flex: 2 }]}>Due Date</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>Paid?</Text>
        </View>
      )}

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
  // Container styles
  container: {
    padding: 24,
    backgroundColor: '#f6f6f6',
    flex: 1,
  },
  containerMobile: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  titleMobile: {
    fontSize: 18,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  buttonContainerMobile: {
    flexDirection: 'column',
    gap: 8,
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  btnMobile: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backBtn: {
    backgroundColor: '#6c757d',
  },
  dashboardBtn: {
    backgroundColor: '#007bff',
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  searchBar: {
    marginBottom: 12,
  },
  searchBarMobile: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#ddd',
    borderRadius: 6,
    padding: 10,
  },
  searchInputMobile: {
    padding: 12,
  },
  // Table styles
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

  // Card styles for mobile
  cardContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  cardValue: {
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
  },
});