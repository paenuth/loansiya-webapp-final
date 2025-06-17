import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLoan } from '../../contexts/LoanContext';

export default function ClientListScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const { loans, loading, error } = useLoan();

  const filteredClients = loans.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) || client.cid.includes(search)
  );

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <Text style={[styles.cell, { flex: 1 }]}>{item.cid}</Text>
      <Text style={[styles.cell, { flex: 2 }]}>{item.name}</Text>
      <TouchableOpacity
        style={styles.viewBtn}
        onPress={() => navigation.navigate('ClientProfile', {
          client: item
        })}
      >
        <Text>View</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#0066ff" />
        <Text style={styles.loadingText}>Loading clients...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Client List</Text>
        <TouchableOpacity
          style={styles.dashboardBtn}
          onPress={() => navigation.navigate('LoanOfficerDashboard')}
        >
          <Text style={styles.btnText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or CID"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, { flex: 1 }]}>CID</Text>
        <Text style={[styles.headerCell, { flex: 2 }]}>Full Name</Text>
        <Text style={[styles.headerCell, { flex: 1 }]}></Text>
      </View>

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
  container: {
    padding: 20,
    backgroundColor: '#f6f6f6',
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
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
    backgroundColor: '#0066ff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
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
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  cell: {
    paddingHorizontal: 6,
  },
  viewBtn: {
    backgroundColor: '#ccc',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
  }
});
