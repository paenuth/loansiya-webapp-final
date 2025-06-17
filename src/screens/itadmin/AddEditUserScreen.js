import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { UsersContext } from '../../contexts/UsersContext';

export default function AddEditUserScreen({ route, navigation }) {
  const { user: passedUser } = route.params || {};
  const user = passedUser ? JSON.parse(JSON.stringify(passedUser)) : undefined;
  const { addUser, updateUser } = useContext(UsersContext);

  const [formData, setFormData] = useState({
    username: user?.username || '',
    fullName: user?.fullName || '',
    role: user?.role || 'Officer',
    status: user?.status || 'Active',
    password: '',
    confirmPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const handleSave = () => {
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
      role: trimmedData.role,
      status: trimmedData.status,
      password: user ? (trimmedData.newPassword || undefined) : trimmedData.password,
    };

    try {
      if (user) {
        updateUser({
          ...userData,
          id: user.id
        });
        alert('User updated successfully!');
      } else {
        addUser(userData);
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
      <View style={styles.topbar}>
        <View style={styles.leftSection}>
          <Text style={styles.brand}>
            <Text style={{ color: '#0066ff' }}>Loan</Text>Siya
          </Text>
          <Text style={styles.title}>{user ? 'Edit User' : 'Add User'}</Text>
        </View>
        <View style={styles.rightSection}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>Back to List</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={formData.fullName}
            onChangeText={(text) => setFormData({ ...formData, fullName: text })}
            placeholder="Enter full name"
          />

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={formData.username}
            onChangeText={(text) => setFormData({ ...formData, username: text })}
            placeholder="Enter username"
            editable={!user}
          />

          <Text style={styles.label}>Role</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <Picker.Item label="Loan Officer" value="Officer" />
              <Picker.Item label="Operations Manager" value="Ops" />
            </Picker>
          </View>

          {user && (
            <>
              <Text style={styles.label}>Status</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <Picker.Item label="Active" value="Active" />
                  <Picker.Item label="Disabled" value="Disabled" />
                </Picker>
              </View>

              <View style={styles.passwordSection}>
                <Text style={styles.sectionTitle}>Change Password</Text>
                <Text style={styles.label}>New Password</Text>
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  value={formData.newPassword}
                  onChangeText={(text) => setFormData({ ...formData, newPassword: text })}
                  placeholder="Enter new password (optional)"
                />

                <Text style={styles.label}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
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
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder="Enter password"
              />

              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                placeholder="Confirm password"
              />
            </>
          )}

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save User</Text>
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
    overflow: 'auto',
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
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    marginBottom: 16,
    overflow: 'hidden',
  },
  saveButton: {
    backgroundColor: '#0066ff',
    padding: 15,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
});
