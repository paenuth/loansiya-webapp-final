import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { AuthContext } from '../../contexts/AuthContext';

export default function TopBar({ navigation, role, showNotifications, unreadCount }) {
  const { logout } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={styles.topbar}>
      <View style={[styles.leftSection, isMobile && styles.leftSectionMobile]}>
        <Text style={[styles.brand, isMobile && styles.brandMobile]}>
          <Text style={{ color: '#0066ff' }}>Loan</Text>Siya
        </Text>
        {!isMobile && <Text style={styles.title}>Dashboard</Text>}
      </View>
      <View style={[styles.rightSection, isMobile && styles.rightSectionMobile]}>
        <Text style={[styles.role, isMobile && styles.roleMobile]}>{role}</Text>
        {showNotifications && (
          <TouchableOpacity
            style={styles.notificationContainer}
            onPress={() => navigation.navigate('LoanOfficerNotifications')}
          >
            <Text style={[styles.icon, isMobile && styles.iconMobile]}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => {
            logout();
            navigation.replace('Login');
          }}
          style={[styles.logoutButton, isMobile && styles.logoutButtonMobile]}
        >
          <Text style={[styles.logout, isMobile && styles.logoutMobile]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.select({ web: '5%', default: 16 }),
    paddingVertical: Platform.select({ web: 15, default: 12 }),
    backgroundColor: '#ddd',
    alignItems: 'center',
    width: '100%',
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
    gap: 15,
  },
  rightSectionMobile: {
    gap: 8,
  },
  brand: {
    fontSize: Platform.select({ web: 22, default: 18 }),
    fontWeight: 'bold',
  },
  brandMobile: {
    fontSize: 16,
  },
  title: {
    fontSize: Platform.select({ web: 20, default: 16 }),
    fontWeight: '500',
  },
  role: {
    fontSize: 16,
  },
  roleMobile: {
    fontSize: 12,
  },
  logoutButton: {
    padding: Platform.select({ web: 8, default: 12 }),
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    minWidth: Platform.select({ web: 80, default: 70 }),
  },
  logoutButtonMobile: {
    padding: 10,
    minWidth: 60,
  },
  logout: {
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  logoutMobile: {
    fontSize: 14,
  },
  notificationContainer: {
    position: 'relative',
    padding: Platform.select({ web: 8, default: 12 }),
  },
  icon: {
    fontSize: Platform.select({ web: 18, default: 20 }),
  },
  iconMobile: {
    fontSize: 16,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
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