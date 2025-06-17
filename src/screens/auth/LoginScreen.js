import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { AuthContext } from '../../contexts/AuthContext';

export default function LoginScreen({ navigation }) {
  const { setCurrentUser } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Sample credentials for both roles
  const validUsers = [
    {
      username: 'admin',
      password: 'admin123',
      role: 'IT_ADMIN'
    },
    {
      username: 'opsmanager',
      password: 'ops123',
      role: 'OPS_MANAGER'
    },
    {
      username: 'officer1',
      password: 'officer123',
      role: 'LOAN_OFFICER'
    }
  ];

 const handleLogin = () => {
      const user = validUsers.find(u => u.username === username && u.password === password);

      if (user) {
        setCurrentUser(user);

        if (user.role === 'IT_ADMIN') {
            navigation.navigate('Dashboard');
          } else if (user.role === 'OPS_MANAGER') {
            navigation.navigate('OpsDashboard');
          } else if (user.role === 'LOAN_OFFICER') {
            navigation.navigate('LoanOfficerDashboard');
          }
      } else {
        alert('Invalid credentials!');
      }
  };


  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>LoanSiya Log-in Portal</Text>
        <Text style={styles.label}>Username</Text>
        <TextInput style={styles.input} onChangeText={setUsername} value={username} />
        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} secureTextEntry onChangeText={setPassword} value={password} />
        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
          <Text style={styles.loginText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f6', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', padding: 30, borderRadius: 10, width: '90%', maxWidth: 400, elevation: 5 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 25 },
  label: { fontSize: 14, marginBottom: 6, color: '#333' },
  input: { backgroundColor: '#e1e1e1', padding: 12, borderRadius: 8, marginBottom: 16 },
  loginBtn: { backgroundColor: '#007bff', paddingVertical: 12, borderRadius: 6, marginTop: 10, alignItems: 'center' },
  loginText: { color: '#fff', fontWeight: '600' },
  forgotText: { textAlign: 'center', marginTop: 12, color: '#000', textDecorationLine: 'underline' }
});