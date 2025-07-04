import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { UsersContext } from '../../contexts/UsersContext';

export default function UserManagementScreen({ navigation }) {
  const { users, loading, updateUser, refreshUsers } = useContext(UsersContext);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Map role types to display names
  const getRoleDisplayName = (user) => {
    if (user.roleType) {
      switch (user.roleType) {
        case 'LOAN_OFFICER': return 'Loan Officer';
        case 'OPS_MANAGER': return 'Operations Manager';
        case 'IT_ADMIN': return 'IT Administrator';
        default: return user.role || 'Unknown';
      }
    }
    return user.role || 'Unknown';
  };

  const renderMobileUserCard = (user) => (
    <View key={user.id} style={styles.mobileCard}>
      <View style={styles.mobileCardHeader}>
        <Text style={styles.mobileCardName}>{user.fullName}</Text>
        <Text style={[
          styles.mobileCardStatus,
          user.status === 'Active' ? styles.activeStatus : styles.disabledStatus
        ]}>
          {user.status}
        </Text>
      </View>
      <View style={styles.mobileCardContent}>
        <Text style={styles.mobileCardLabel}>Username: <Text style={styles.mobileCardValue}>{user.username}</Text></Text>
        <Text style={styles.mobileCardLabel}>Role: <Text style={styles.mobileCardValue}>{getRoleDisplayName(user)}</Text></Text>
      </View>
      <View style={styles.mobileCardActions}>
        <TouchableOpacity
          onPress={() => {
            try {
              const newStatus = user.status === 'Active' ? 'Disabled' : 'Active';
              updateUser({
                id: user.id,
                status: newStatus
              });
            } catch (error) {
              alert(`Error updating user: ${error.message}`);
            }
          }}
          style={[styles.mobileActionButton,
            user.status === 'Active' ? styles.disableButtonMobile : styles.enableButtonMobile
          ]}
        >
          <Text style={styles.mobileActionButtonText}>
            {user.status === 'Active' ? 'Disable' : 'Enable'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            const userCopy = JSON.parse(JSON.stringify(user));
            navigation.navigate('AddEditUser', { user: userCopy });
          }}
          style={[styles.mobileActionButton, styles.editButtonMobile]}
        >
          <Text style={styles.mobileActionButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={[styles.topbar, isMobile && styles.topbarMobile]}>
        <View style={[styles.leftSection, isMobile && styles.leftSectionMobile]}>
          <Text style={[styles.brand, isMobile && styles.brandMobile]}>
            <Text style={{ color: '#0066ff' }}>Loan</Text>Siya
          </Text>
          {!isMobile && <Text style={styles.title}>User Management</Text>}
        </View>
        <View style={styles.rightSection}>
          <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
            <Text style={[styles.backButton, isMobile && styles.backButtonMobile]}>
              {isMobile ? 'Back' : 'Back to Dashboard'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={[styles.content, isMobile && styles.contentMobile]}>
        <View style={[styles.header, isMobile && styles.headerMobile]}>
          <Text style={[styles.pageTitle, isMobile && styles.pageTitleMobile]}>
            {isMobile ? 'Users' : 'Users List'}
          </Text>
          <TouchableOpacity
            style={[styles.addButton, isMobile && styles.addButtonMobile]}
            onPress={() => navigation.navigate('AddEditUser')}
          >
            <Text style={[styles.addButtonText, isMobile && styles.addButtonTextMobile]}>
              {isMobile ? 'Add' : 'Add User'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.table}>
          {isMobile ? (
            // Mobile Card Layout
            <View style={styles.mobileContainer}>
              {users.filter(user => user.roleType !== 'IT_ADMIN').map(renderMobileUserCard)}
            </View>
          ) : (
            // Desktop Table Layout
            <>
              {/* Table Headers */}
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, { flex: 2 }]}>Name</Text>
                <Text style={[styles.headerCell, { flex: 1.5 }]}>Username</Text>
                <Text style={[styles.headerCell, { flex: 1 }]}>Role</Text>
                <Text style={[styles.headerCell, { flex: 1 }]}>Status</Text>
                <Text style={[styles.headerCell, { flex: 1 }]}>Action</Text>
              </View>

              {/* Table Rows */}
              {users.filter(user => user.roleType !== 'IT_ADMIN').map((user) => (
                <View key={user.id} style={styles.tableRow}>
                  <Text style={[styles.cell, { flex: 2 }]}>{user.fullName}</Text>
                  <Text style={[styles.cell, { flex: 1.5 }]}>{user.username}</Text>
                  <Text style={[styles.cell, { flex: 1 }]}>{getRoleDisplayName(user)}</Text>
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
            </>
          )}
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
  topbarMobile: {
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  leftSectionMobile: {
    gap: 10,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brand: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  brandMobile: {
    fontSize: 18,
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
  backButtonMobile: {
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  contentMobile: {
    padding: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerMobile: {
    marginBottom: 15,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  pageTitleMobile: {
    fontSize: 20,
  },
  addButton: {
    backgroundColor: '#0066ff',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  addButtonMobile: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  addButtonTextMobile: {
    fontSize: 14,
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
  // Mobile-specific styles
  mobileContainer: {
    gap: 15,
  },
  mobileCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mobileCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mobileCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  mobileCardStatus: {
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  mobileCardContent: {
    marginBottom: 15,
  },
  mobileCardLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  mobileCardValue: {
    color: '#333',
    fontWeight: '500',
  },
  mobileCardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  mobileActionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    alignItems: 'center',
  },
  mobileActionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  enableButtonMobile: {
    backgroundColor: '#28a745',
  },
  disableButtonMobile: {
    backgroundColor: '#dc3545',
  },
  editButtonMobile: {
    backgroundColor: '#0066ff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});