import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
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

export default function OpsClientProfileScreen({ navigation, route }) {
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
        <Text style={styles.logo}><Text style={{ color: '#0066ff' }}>Loan</Text>Siya</Text>
        <Text style={styles.role}>Operations Manager</Text>
      </View>

      {/* Body */}
      <View style={styles.content}>
        {/* LEFT SIDE */}
        <View style={styles.left}>
          <Text style={styles.sectionTitle}>Client Profile</Text>
          <Text style={styles.subTitle}>Personal Details</Text>
          <Text><Text style={styles.bold}>Name:</Text> {client.name}</Text>
          <Text><Text style={styles.bold}>Age:</Text> {client.age}</Text>
          <Text><Text style={styles.bold}>CID:</Text> {client.cid}</Text>
          <Text><Text style={styles.bold}>Email:</Text> {client.email}</Text>
          <Text><Text style={styles.bold}>Number:</Text> {client.number}</Text>
          <Text><Text style={styles.bold}>Address:</Text> {client.address}</Text>

          <Text style={[styles.subTitle, { marginTop: 16 }]}>Uploaded Document</Text>
          {client.documents.map((doc, i) => (
            <View key={i} style={styles.documentRow}>
              <Text>{doc}</Text>
              <TouchableOpacity style={styles.viewBtn}><Text>View</Text></TouchableOpacity>
            </View>
          ))}
        </View>

        {/* RIGHT SIDE */}
        <View style={styles.right}>
          <Text style={styles.sectionTitle}>Financial Record</Text>
          <Text>Monthly Income ₱{client.financial.monthlyIncome.toLocaleString()}</Text>
          <Text>Monthly Expenses ₱{client.financial.monthlyExpenses.toLocaleString()}</Text>
          <Text>Saving and Assets ₱{client.financial.assets.toLocaleString()}</Text>
          <Text>Debt to Income Ratio {client.financial.dti}%</Text>

          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Employment or Business info</Text>
          <Text>{client.employer}</Text>
          <Text>{client.position}</Text>


          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Loan History</Text>
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => navigation.navigate('LoanHistory', {
              clientId: client.cid,
              userRole: 'ops'
            })}
          >
            <Text>View</Text>
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.backBtn} 
              onPress={() => navigation.goBack()}
            >
              <Text>← Back to List</Text>
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
    flex: 1 
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
    justifyContent: 'space-between',
    backgroundColor: '#ddd',
    padding: 20,
    alignItems: 'center',
  },
  logo: { 
    fontSize: 22, 
    fontWeight: 'bold' 
  },
  role: {
    fontSize: 14
  },
  content: { 
    flexDirection: 'row', 
    padding: 20 
  },
  left: {
    flex: 1.1,
    paddingRight: 10,
    borderRightWidth: 1,
    borderColor: '#ccc',
  },
  right: {
    flex: 1.3,
    paddingLeft: 15,
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
  viewBtn: {
    backgroundColor: '#ccc',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 20,
    gap: 10,
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
