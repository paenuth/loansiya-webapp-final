import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { UsersContext } from '../../contexts/UsersContext';

export default function AddEditUserScreen({ route, navigation }) {
  const { user: passedUser } = route.params || {};
  const user = passedUser ? JSON.parse(JSON.stringify(passedUser)) : undefined;
  const { addUser, updateUser } = useContext(UsersContext);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Map display roles to API roles and vice versa
  const getRoleForAPI = (displayRole) => {
    switch (displayRole) {
      case 'Loan Officer': return 'LOAN_OFFICER';
      case 'Operations Manager': return 'OPS_MANAGER';
      case 'IT Administrator': return 'IT_ADMIN';
      default: return 'LOAN_OFFICER';
    }
  };

  const getDisplayRole = (apiRole) => {
    switch (apiRole) {
      case 'LOAN_OFFICER': return 'Loan Officer';
      case 'OPS_MANAGER': return 'Operations Manager';
      case 'IT_ADMIN': return 'IT Administrator';
      default: return 'Loan Officer';
    }
  };

  const [formData, setFormData] = useState({
    username: user?.username || '',
    fullName: user?.fullName || '',
    role: user ? getDisplayRole(user.roleType || user.role) : 'Loan Officer',
    status: user?.status || 'Active',
    password: '',
    confirmPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const handleSave = async () => {
    // Trim whitespace from inputs
    const trimmedData = {
      ...formData,
      username: formData.username.trim(),
      fullName: formData.fullName.trim()
    };

    // Basic validation
    if (!trimmedData.username || !trimmedData.fullName) {
      alert('Please fill in all required fields (Username and Full Name)');
      return;
    }

    // Username validation
    if (trimmedData.username.length < 3) {
      alert('Username must be at least 3 characters long');
      return;
    }

    // Full name validation
    if (trimmedData.fullName.length < 2) {
      alert('Full name must be at least 2 characters long');
      return;
    }

    // Password validation for new users
    if (!user && (!trimmedData.password || !trimmedData.confirmPassword)) {
      alert('Password is required for new users');
      return;
    }

    if (!user && trimmedData.password !== trimmedData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (!user && trimmedData.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    // Password validation for existing users (if changing password)
    if (user && trimmedData.newPassword) {
      if (!trimmedData.confirmNewPassword) {
        alert('Please confirm the new password');
        return;
      }
      if (trimmedData.newPassword !== trimmedData.confirmNewPassword) {
        alert('New passwords do not match');
        return;
      }
      if (trimmedData.newPassword.length < 6) {
        alert('New password must be at least 6 characters long');
        return;
      }
    }

    // Prepare user data
    const userData = {
      username: trimmedData.username,
      fullName: trimmedData.fullName,
      role: getRoleForAPI(trimmedData.role), // Convert to API format
      status: trimmedData.status,
      password: user ? (trimmedData.newPassword || undefined) : trimmedData.password,
    };

    try {
      if (user) {
        await updateUser({
          ...userData,
          id: user.id
        });
        alert('User updated successfully!');
      } else {
        await addUser(userData);
        alert('User added successfully!');
      }
      navigation.setParams({ user: undefined });
      navigation.goBack();
    } catch (error) {
      alert(`Error: ${error.message}`);
      return;
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topbar, isMobile && styles.topbarMobile]}>
        <View style={[styles.leftSection, isMobile && styles.leftSectionMobile]}>
          <Text style={[styles.brand, isMobile && styles.brandMobile]}>
            <Text style={{ color: '#0066ff' }}>Loan</Text>Siya
          </Text>
          {!isMobile && <Text style={styles.title}>{user ? 'Edit User' : 'Add User'}</Text>}
        </View>
        <View style={styles.rightSection}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.backButton, isMobile && styles.backButtonMobile]}>
              {isMobile ? 'Back' : 'Back to List'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={[styles.content, isMobile && styles.contentMobile]} showsVerticalScrollIndicator={false}>
        {isMobile && (
          <Text style={styles.mobileTitle}>{user ? 'Edit User' : 'Add User'}</Text>
        )}
        <View style={[styles.form, isMobile && styles.formMobile]}>
          <Text style={[styles.label, isMobile && styles.labelMobile]}>Full Name</Text>
          <TextInput
            style={[styles.input, isMobile && styles.inputMobile]}
            value={formData.fullName}
            onChangeText={(text) => setFormData({ ...formData, fullName: text })}
            placeholder="Enter full name"
          />

          <Text style={[styles.label, isMobile && styles.labelMobile]}>Username</Text>
          <TextInput
            style={[styles.input, isMobile && styles.inputMobile]}
            value={formData.username}
            onChangeText={(text) => setFormData({ ...formData, username: text })}
            placeholder="Enter username"
            editable={!user}
          />

          <Text style={[styles.label, isMobile && styles.labelMobile]}>Role</Text>
          <View style={[styles.pickerContainer, isMobile && styles.pickerContainerMobile]}>
            <Picker
              selectedValue={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <Picker.Item label="Loan Officer" value="Loan Officer" />
              <Picker.Item label="Operations Manager" value="Operations Manager" />
              {/* IT Admin can only edit existing IT Admins, not create new ones */}
              {user && user.roleType === 'IT_ADMIN' && (
                <Picker.Item label="IT Administrator" value="IT Administrator" />
              )}
            </Picker>
          </View>

          {user && (
            <>
              <Text style={[styles.label, isMobile && styles.labelMobile]}>Status</Text>
              <View style={[styles.pickerContainer, isMobile && styles.pickerContainerMobile]}>
                <Picker
                  selectedValue={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <Picker.Item label="Active" value="Active" />
                  <Picker.Item label="Disabled" value="Disabled" />
                </Picker>
              </View>

              <View style={[styles.passwordSection, isMobile && styles.passwordSectionMobile]}>
                <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>Change Password</Text>
                <Text style={[styles.label, isMobile && styles.labelMobile]}>New Password</Text>
                <TextInput
                  style={[styles.input, isMobile && styles.inputMobile]}
                  secureTextEntry
                  value={formData.newPassword}
                  onChangeText={(text) => setFormData({ ...formData, newPassword: text })}
                  placeholder="Enter new password (optional)"
                />

                <Text style={[styles.label, isMobile && styles.labelMobile]}>Confirm New Password</Text>
                <TextInput
                  style={[styles.input, isMobile && styles.inputMobile]}
                  secureTextEntry
                  value={formData.confirmNewPassword}
                  onChangeText={(text) => setFormData({ ...formData, confirmNewPassword: text })}
                  placeholder="Confirm new password"
                />
              </View>
            </>
          )}

          {!user && (
            <>
              <Text style={[styles.label, isMobile && styles.labelMobile]}>Password</Text>
              <TextInput
                style={[styles.input, isMobile && styles.inputMobile]}
                secureTextEntry
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder="Enter password"
              />

              <Text style={[styles.label, isMobile && styles.labelMobile]}>Confirm Password</Text>
              <TextInput
                style={[styles.input, isMobile && styles.inputMobile]}
                secureTextEntry
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                placeholder="Confirm password"
              />
            </>
          )}

          <TouchableOpacity style={[styles.saveButton, isMobile && styles.saveButtonMobile]} onPress={handleSave}>
            <Text style={[styles.saveButtonText, isMobile && styles.saveButtonTextMobile]}>Save User</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    overflow: 'auto',
  },
  contentMobile: {
    padding: 15,
  },
  mobileTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
    overflow: 'visible',
    minHeight: 'min-content',
  },
  formMobile: {
    padding: 15,
    maxWidth: '100%',
    borderRadius: 12,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  labelMobile: {
    fontSize: 15,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    fontSize: 16,
  },
  inputMobile: {
    padding: 14,
    fontSize: 16,
    marginBottom: 18,
  },
  pickerContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    marginBottom: 16,
    overflow: 'hidden',
  },
  pickerContainerMobile: {
    marginBottom: 18,
  },
  saveButton: {
    backgroundColor: '#0066ff',
    padding: 15,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonMobile: {
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextMobile: {
    fontSize: 17,
  },
  passwordSection: {
    marginTop: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  passwordSectionMobile: {
    padding: 15,
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  sectionTitleMobile: {
    fontSize: 17,
    marginBottom: 12,
  },
});
