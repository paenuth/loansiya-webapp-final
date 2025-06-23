import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { useLoan } from '../../contexts/LoanContext';
import { sharedStyles } from '../../styles/shared';

export default function ClientList({ 
  navigation, 
  userRole = 'loanofficer',
  onClientPress,
  dashboardRoute
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  const [search, setSearch] = useState('');
  const { loans, loading, error } = useLoan();

  const filteredClients = loans.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) || client.cid.includes(search)
  );

  const handleClientPress = (client) => {
    if (onClientPress) {
      onClientPress(client);
    } else {
      const screenName = userRole === 'ops' ? 'OpsClientProfile' : 'ClientProfile';
      navigation.navigate(screenName, {
        client: {
          ...client,
          cid: client.cid,
          name: client.name || 'N/A',
          age: client.age || 0,
          email: client.email || 'N/A',
          number: client.number || 'N/A',
          address: client.address || 'N/A',
          financial: client.financial || {
            monthlyIncome: 0,
            monthlyExpenses: 0,
            assets: 0,
            dti: 0
          }
        }
      });
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.row, isMobile && styles.rowMobile]}
      onPress={() => isMobile && handleClientPress(item)}
    >
      {isMobile ? (
        // Mobile layout
        <View style={styles.mobileContent}>
          <Text style={styles.mobileName}>{item.name}</Text>
          <Text style={styles.mobileCid}>CID: {item.cid}</Text>
        </View>
      ) : (
        // Desktop layout
        <View style={styles.rowContent}>
          <Text style={[styles.cell, styles.cidCell]}>{item.cid}</Text>
          <Text style={[styles.cell, styles.nameCell]}>{item.name}</Text>
          <View style={styles.actionCell}>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => handleClientPress(item)}
            >
              <Text style={styles.viewBtnText}>View</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[sharedStyles.container, sharedStyles.centerContent]}>
        <ActivityIndicator size="large" color="#0066ff" />
        <Text style={sharedStyles.loadingText}>Loading clients...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[sharedStyles.container, sharedStyles.centerContent]}>
        <Text style={sharedStyles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={sharedStyles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[sharedStyles.title, isMobile && sharedStyles.titleMobile]}>Client List</Text>
          <TouchableOpacity
            style={[styles.dashboardBtn, isMobile && styles.dashboardBtnMobile]}
            onPress={() => navigation.navigate(dashboardRoute)}
          >
            <Text style={[styles.btnText, isMobile && styles.btnTextMobile]}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>

        <View style={[sharedStyles.searchBar.container, isMobile && styles.searchBarMobile]}>
          <TextInput
            style={[sharedStyles.searchBar.input, isMobile && sharedStyles.searchBar.inputMobile]}
            placeholder="Search by name or CID"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {!isMobile && (
        <View style={styles.tableHeader}>
          <View style={styles.rowContent}>
            <Text style={[styles.headerCell, styles.cidCell]}>CID</Text>
            <Text style={[styles.headerCell, styles.nameCell]}>Full Name</Text>
            <View style={styles.actionCell}>
              <Text style={styles.headerCell}></Text>
            </View>
          </View>
        </View>
      )}

      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item.cid}
        renderItem={renderItem}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {search ? 'No clients match your search' : 'No clients found'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.select({ web: 20, default: 16 }),
  },
  dashboardBtn: {
    backgroundColor: '#0066ff',
    paddingVertical: Platform.select({ web: 10, default: 8 }),
    paddingHorizontal: Platform.select({ web: 16, default: 12 }),
    borderRadius: 8,
  },
  dashboardBtnMobile: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: Platform.select({ web: 16, default: 14 }),
  },
  btnTextMobile: {
    fontSize: 14,
  },
  searchBarMobile: {
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e9ecef',
    paddingVertical: 12,
    paddingHorizontal: Platform.select({ web: 16, default: 12 }),
    marginBottom: 4,
    borderRadius: 8,
    alignItems: 'flex-start',
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
    paddingHorizontal: Platform.select({ web: 16, default: 12 }),
    marginBottom: 8,
    borderRadius: 8,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  rowMobile: {
    padding: 12,
  },
  rowContent: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  cell: {
    paddingHorizontal: 6,
    fontSize: Platform.select({ web: 16, default: 14 }),
    color: '#212529',
  },
  cidCell: {
    width: '25%',
    textAlign: 'left',
  },
  nameCell: {
    width: '50%',
    textAlign: 'left',
  },
  actionCell: {
    width: '25%',
    alignItems: 'flex-end',
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
  emptyContainer: {
    padding: Platform.select({ web: 20, default: 16 }),
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Platform.select({ web: 16, default: 14 }),
    color: '#6c757d',
  },
});