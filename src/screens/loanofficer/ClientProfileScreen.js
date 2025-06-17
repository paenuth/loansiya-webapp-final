import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLoan } from '../../contexts/LoanContext';

const defaultClient = {
  name: 'N/A',
  age: 0,
  cid: '',
  email: 'N/A',
  number: 'N/A',
  address: 'N/A',
  documents: ['Valid Id', 'ORCR', 'Land Title', 'Deeds of Assignment', 'Signed Documents'],
  financial: {
    monthlyIncome: 0,
    monthlyExpenses: 0,
    assets: 0,
    dti: 0
  },
  employer: 'N/A',
  position: 'N/A'
};

export default function ClientProfileScreen({ route, navigation }) {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { refreshClientData } = useLoan();
  const cid = route.params?.client?.cid;

  useEffect(() => {
    if (cid) {
      loadClientData();
    }
  }, [cid]);

  const loadClientData = async () => {
    try {
      setLoading(true);
      setError(null);
      const clientData = await refreshClientData(cid);
      setClient({
        ...defaultClient,
        ...clientData
      });
    } catch (err) {
      console.error('Error loading client:', err);
      setError('Failed to load client data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#0066ff" />
        <Text style={styles.loadingText}>Loading client data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadClientData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Client not found</Text>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => navigation.goBack()}
        >
          <Text>← Back to List</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <View style={styles.leftSection}>
          <Text style={styles.logo}><Text style={{ color: '#0066ff' }}>Loan</Text>Siya</Text>
        </View>
        <View style={styles.rightSection}>
          <Text style={styles.role}>Loan Officer</Text>
          <TouchableOpacity onPress={() => navigation.replace('Login')}>
            <Text style={styles.logout}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Left side */}
        <View style={styles.left}>
          <Text style={styles.sectionTitle}>Client Profile</Text>

          <Text style={styles.subTitle}>Personal Details</Text>
          <Text><Text style={styles.bold}>Name:</Text> {client.name}</Text>
          <Text><Text style={styles.bold}>Age:</Text> {client.age}</Text>
          <Text><Text style={styles.bold}>CID:</Text> {client.cid}</Text>
          <Text><Text style={styles.bold}>Email:</Text> {client.email}</Text>
          <Text><Text style={styles.bold}>Number:</Text> {client.number}</Text>
          <Text><Text style={styles.bold}>Address:</Text> {client.address}</Text>

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Uploaded Document</Text>
          {client.documents.map((doc, index) => (
            <View key={index} style={styles.documentRow}>
              <Text style={styles.docText}>{doc}</Text>
              <TouchableOpacity style={styles.viewBtn}>
                <Text>View</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Right side */}
        <View style={styles.right}>
          <Text style={styles.sectionTitle}>Financial Record</Text>
          <Text>Monthly Income ₱{client.financial.monthlyIncome.toLocaleString()}</Text>
          <Text>Monthly Expenses ₱{client.financial.monthlyExpenses.toLocaleString()}</Text>
          <Text>Saving and Assets ₱{client.financial.assets.toLocaleString()}</Text>
          <Text>Debt to Income Ratio {client.financial.dti}%</Text>

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Employment or Business info</Text>
          <Text>{client.employer}</Text>
          <Text>{client.position}</Text>

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Loan History</Text>
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => navigation.navigate('LoanHistory', {
              clientId: client.cid,
              userRole: 'loanofficer'
            })}
          >
            <Text>View</Text>
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.backBtn} 
              onPress={() => navigation.goBack()}
            >
              <Text>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.refreshBtn} 
              onPress={loadClientData}
            >
              <Text>↻ Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f6f6f6',
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  },
  retryBtn: {
    backgroundColor: '#0066ff',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  topbar: {
    flexDirection: 'row',
    backgroundColor: '#ddd',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  role: {
    fontSize: 14,
  },
  logout: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flexDirection: 'row',
    padding: 20,
  },
  left: {
    flex: 1.2,
    marginRight: 10,
    paddingRight: 10,
    borderRightWidth: 1,
    borderColor: '#ccc',
  },
  right: {
    flex: 1,
    paddingLeft: 10,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
  },
  subTitle: {
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 6,
  },
  bold: {
    fontWeight: 'bold',
  },
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#eaeaea',
    padding: 8,
    marginBottom: 5,
    borderRadius: 4,
  },
  docText: {
    flex: 1,
  },
  viewBtn: {
    backgroundColor: '#ccc',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  backBtn: {
    backgroundColor: '#ddd',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  refreshBtn: {
    backgroundColor: '#28a745',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  }
});
