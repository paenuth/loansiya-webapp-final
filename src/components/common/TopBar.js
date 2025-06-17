import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function TopBar({ navigation, role, showNotifications, unreadCount }) {
  return (
    <View style={styles.topbar}>
      <View style={styles.leftSection}>
        <Text style={styles.brand}>
          <Text style={{ color: '#0066ff' }}>Loan</Text>Siya
        </Text>
        <Text style={styles.title}>Dashboard</Text>
      </View>
      <View style={styles.rightSection}>
        <Text style={styles.role}>{role}</Text>
        {showNotifications && (
          <TouchableOpacity
            style={styles.notificationContainer}
            onPress={() => navigation.navigate('LoanOfficerNotifications')}
          >
            <Text style={styles.icon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => navigation.replace('Login')}
          style={styles.logoutButton}
        >
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    gap: 15,
  },
  brand: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
  },
  role: {
    fontSize: 16,
  },
  logoutButton: {
    padding: 8,
  },
  logout: {
    fontWeight: 'bold',
    color: '#000',
  },
  notificationContainer: {
    position: 'relative',
    marginRight: 10,
  },
  icon: {
    fontSize: 18,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});