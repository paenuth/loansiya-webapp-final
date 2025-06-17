import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { AuthContext } from '../../contexts/AuthContext';

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Sample user data - in real app this would come from a backend
  const users = [
    { username: 'admin', role: 'IT_ADMIN' },
    { username: 'officer1', role: 'OFFICER' },
  ];

  const handleSubmitUsername = () => {
    const user = users.find(u => u.username === username);
    if (user) {
      setIsAdmin(user.role === 'IT_ADMIN');
      if (user.role === 'IT_ADMIN') {
        setStep(2);
      } else {
        setStep(4); // Show contact admin message for non-admin users
      }
    } else {
      alert('Username not found!');
    }
  };

  const handleResetPassword = () => {
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }
    // In a real app, this would make an API call to reset the password
    setStep(3); // Show email confirmation message
  };

  const renderStep1 = () => (
    <View>
      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.subtitle}>Enter your username (ex. officer1)</Text>
      <Text style={styles.label}>Enter Username:</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        placeholder="Username"
      />
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitUsername}>
        <Text style={styles.submitText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.title}>Hello Admin!</Text>
      <Text style={styles.label}>Email:</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Enter your email"
        keyboardType="email-address"
      />
      <Text style={styles.label}>New Password:</Text>
      <TextInput
        style={styles.input}
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        placeholder="Enter new password"
      />
      <Text style={styles.label}>Confirm Password:</Text>
      <TextInput
        style={styles.input}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        placeholder="Confirm new password"
      />
      <TouchableOpacity style={styles.submitBtn} onPress={handleResetPassword}>
        <Text style={styles.submitText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.title}>Hello Admin!</Text>
      <Text style={styles.message}>
        Please check your email, we have sent you a confirmation.
      </Text>
      <TouchableOpacity style={styles.submitBtn} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.submitText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep4 = () => (
    <View>
      <Text style={styles.title}>Hello!</Text>
      <Text style={styles.message}>
        Please contact the IT Admin for password assistance!
      </Text>
      <TouchableOpacity style={styles.submitBtn} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.submitText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 10,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    color: '#333',
  },
  input: {
    backgroundColor: '#e1e1e1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 10,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: '600',
  },
  message: {
    textAlign: 'center',
    fontSize: 16,
    marginVertical: 20,
    color: '#666',
  },
});