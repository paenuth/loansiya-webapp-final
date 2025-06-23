import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { AuthContext } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';

export default function LoginScreen({ navigation }) {
  const { setCurrentUser, currentUser } = useContext(AuthContext);
  
  // Check for saved user on component mount
  useEffect(() => {
    if (currentUser) {
      // Navigate based on role
      if (currentUser.role === 'IT_ADMIN') {
        navigation.navigate('Dashboard');
      } else if (currentUser.role === 'OPS_MANAGER') {
        navigation.navigate('OpsDashboard');
      } else if (currentUser.role === 'LOAN_OFFICER') {
        navigation.navigate('LoanOfficerDashboard');
      }
    }
  }, [currentUser, navigation]);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const response = await authAPI.login(username, password);
      
      if (response.user) {
        setCurrentUser(response.user);
        
        if (response.user.role === 'IT_ADMIN') {
          navigation.navigate('Dashboard');
        } else if (response.user.role === 'OPS_MANAGER') {
          navigation.navigate('OpsDashboard');
        } else if (response.user.role === 'LOAN_OFFICER') {
          navigation.navigate('LoanOfficerDashboard');
        }
      }
    } catch (error) {
      alert(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <View style={styles.container}>
      <View style={[styles.card, isMobile && styles.cardMobile]}>
        <Text style={styles.title}>LoanSiya Log-in Portal</Text>
        <Text style={styles.label}>Username</Text>
        <TextInput style={styles.input} onChangeText={setUsername} value={username} />
        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} secureTextEntry onChangeText={setPassword} value={password} />
        <TouchableOpacity
          style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text style={styles.loginText}>{isLoading ? 'Logging in...' : 'Login'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>
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
    padding: Platform.select({ web: 40, default: 20 })
  },
  card: {
    backgroundColor: '#fff',
    padding: Platform.select({ web: 40, default: 24 }),
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardMobile: {
    padding: 20,
    width: '95%',
  },
  title: {
    fontSize: Platform.select({ web: 24, default: 20 }),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Platform.select({ web: 30, default: 20 }),
    color: '#333'
  },
  label: {
    fontSize: Platform.select({ web: 16, default: 14 }),
    marginBottom: 8,
    color: '#333',
    fontWeight: '500'
  },
  input: {
    backgroundColor: '#e1e1e1',
    padding: Platform.select({ web: 14, default: 12 }),
    borderRadius: 8,
    marginBottom: 20,
    fontSize: Platform.select({ web: 16, default: 14 }),
    borderWidth: 1,
    borderColor: '#ccc'
  },
  loginBtn: {
    backgroundColor: '#007bff',
    paddingVertical: Platform.select({ web: 14, default: 12 }),
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
    width: '100%'
  },
  loginBtnDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10
  },
  loginBtnDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7
  },
  loginText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: Platform.select({ web: 16, default: 14 })
  },
  forgotText: {
    textAlign: 'center',
    marginTop: 16,
    color: '#007bff',
    textDecorationLine: 'underline',
    fontSize: Platform.select({ web: 14, default: 12 })
  }
});