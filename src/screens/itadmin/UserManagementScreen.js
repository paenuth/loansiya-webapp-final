import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { UsersContext } from '../../contexts/UsersContext';

export default function UserManagementScreen({ navigation }) {
  const { users, updateUser } = useContext(UsersContext);

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topbar}>
        <View style={styles.leftSection}>
          <Text style={styles.brand}>
            <Text style={{ color: '#0066ff' }}>Loan</Text>Siya
          </Text>
          <Text style={styles.title}>User Management</Text>
        </View>
        <View style={styles.rightSection}>
          <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
            <Text style={styles.backButton}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Users List</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('AddEditUser')}
          >
            <Text style={styles.addButtonText}>Add User</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.table}>
          {/* Table Headers */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, { flex: 2 }]}>Name</Text>
            <Text style={[styles.headerCell, { flex: 1.5 }]}>Username</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>Role</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>Status</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>Action</Text>
          </View>

          {/* Table Rows */}
          {users.map((user) => (
            <View key={user.id} style={styles.tableRow}>
              <Text style={[styles.cell, { flex: 2 }]}>{user.fullName}</Text>
              <Text style={[styles.cell, { flex: 1.5 }]}>{user.username}</Text>
              <Text style={[styles.cell, { flex: 1 }]}>{user.role}</Text>
              <Text 
                style={[
                  styles.cell, 
                  { flex: 1 },
                  user.status === 'Active' ? styles.activeStatus : styles.disabledStatus
                ]}
              >
                {user.status}
              </Text>
              <View style={[styles.cell, { flex: 1, flexDirection: 'row', gap: 15 }]}>
                <TouchableOpacity
                  onPress={() => {
                    try {
                      const newStatus = user.status === 'Active' ? 'Disabled' : 'Active';
                      // Only update the status field with the user ID
                      updateUser({
                        id: user.id,
                        status: newStatus
                      });
                    } catch (error) {
                      alert(`Error updating user: ${error.message}`);
                    }
                  }}
                  style={styles.actionButtonContainer}
                >
                  <Text style={[
                    styles.actionButton,
                    user.status === 'Active' ? styles.disableButton : styles.enableButton
                  ]}>
                    {user.status === 'Active' ? 'Disable' : 'Enable'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    // Pass a deep copy of the user to prevent reference issues
                    const userCopy = JSON.parse(JSON.stringify(user));
                    navigation.navigate('AddEditUser', { user: userCopy });
                  }}
                  style={styles.actionButtonContainer}
                >
                  <Text style={styles.editButton}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ddd',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brand: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
  },
  backButton: {
    color: '#0066ff',
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#0066ff',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  table: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e2e2e2',
    padding: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  headerCell: {
    fontWeight: 'bold',
    color: '#333',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cell: {
    color: '#444',
  },
  activeStatus: {
    color: '#28a745',
  },
  disabledStatus: {
    color: '#dc3545',
  },
  editButton: {
    color: '#0066ff',
    fontWeight: '500',
  },
  actionButton: {
    fontWeight: '500',
  },
  enableButton: {
    color: '#28a745',
  },
  disableButton: {
    color: '#dc3545',
  },
  actionButtonContainer: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
});