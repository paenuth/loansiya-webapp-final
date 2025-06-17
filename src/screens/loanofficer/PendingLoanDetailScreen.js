import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useLoan } from '../../contexts/LoanContext';
import { clientAPI } from '../../services/api';

const defaultClient = {
  name: 'N/A',
  age: 0,
  cid: '',
  email: 'N/A',
  number: 'N/A',
  address: 'N/A',
  input: {
    paymentHistory: 0,
    creditUtilization: 0,
    creditHistoryLength: 0,
    creditMix: 0,
    newInquiries: 0
  },
  financial: {
    monthlyIncome: 0,
    monthlyExpenses: 0,
    assets: 0,
    dti: 0
  },
  employer: 'N/A',
  position: 'N/A',
  loans: {
    approved: {
      amount: 0,
      status: 'None'
    },
    pending: {
      amount: 0,
      status: 'None'
    },
    loanHistory: []
  },
  loanBalance: {
    amount: 0,
    dueDate: 'N/A'
  }
};
export default function PendingLoanDetailScreen({ navigation, route }) {
  const [client, setClient] = useState(null);
  const [loanData, setLoanData] = useState(null);
  const { loans, refreshClientData } = useLoan();

  const fetchLoanData = async (cid) => {
    try {
      // First check if API is accessible
      try {
        const healthCheck = await fetch('http://localhost:5600/clients');
        if (!healthCheck.ok) {
          throw new Error('API server is not responding properly');
        }
      } catch (err) {
        throw new Error('API server is not running. Please start the credit-scoring-api server first.');
      }

      // Use clientAPI to fetch loan data
      const data = await clientAPI.fetchClientLoanData(cid);
      setLoanData(data);
    } catch (err) {
      console.error('Error fetching loan data:', err);
    }
  };

  useEffect(() => {
    if (route.params?.client) {
      const initialClient = {
        ...defaultClient,
        ...route.params.client
      };
      setClient(initialClient);
      if (initialClient.cid) {
        fetchLoanData(initialClient.cid);
        refreshClientData(initialClient.cid); // Refresh to get latest data
      }
    }
  }, [route.params?.client]);

  // Refresh when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (client?.cid) {
        fetchLoanData(client.cid);
        refreshClientData(client.cid);
      }
    });

    return unsubscribe;
  }, [navigation, client]);

  if (!client) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const calculateScore = () => {
    const weights = {
      paymentHistory: 0.35,
      creditUtilization: 0.30,
      creditHistoryLength: 0.15,
      creditMix: 0.10,
      newInquiries: 0.10,
    };

    const input = client.input;
    
    // Normalize inputs to 0-1 scale
    const normalized = {
      paymentHistory: input.paymentHistory / 100,
      creditUtilization: 1 - (input.creditUtilization / 100),
      creditHistoryLength: Math.min(input.creditHistoryLength / 60, 1),
      creditMix: input.creditMix / 100,
      newInquiries: 1 - (input.newInquiries / 100),
    };

    const weightedSum =
      weights.paymentHistory * normalized.paymentHistory +
      weights.creditUtilization * normalized.creditUtilization +
      weights.creditHistoryLength * normalized.creditHistoryLength +
      weights.creditMix * normalized.creditMix +
      weights.newInquiries * normalized.newInquiries;

    // Scale to 300-850 range
    return Math.round(300 + weightedSum * 550);
  };

  const calculateDefaultProbability = () => {
    const logisticWeights = {
      intercept: -4,
      paymentHistory: 5,
      creditUtilization: -3,
      creditHistoryLength: 2,
      creditMix: 1,
      newInquiries: -2,
    };

    const input = client.input;
    const z =
      logisticWeights.intercept +
      logisticWeights.paymentHistory * (input.paymentHistory / 100) +
      logisticWeights.creditUtilization * (input.creditUtilization / 100) +
      logisticWeights.creditHistoryLength * (input.creditHistoryLength / 100) +
      logisticWeights.creditMix * (input.creditMix / 100) +
      logisticWeights.newInquiries * (input.newInquiries / 100);

    return parseFloat((1 / (1 + Math.exp(-z))).toFixed(4));
  };

  const getRiskCategory = (score) => {
    if (score >= 800) return 'Exceptional';
    if (score >= 740) return 'Very Good';
    if (score >= 670) return 'Good';
    if (score >= 580) return 'Fair';
    return 'Poor';
  };

  const getRecommendation = (category) => {
    if (category === 'Poor') return 'REVIEW OR DECLINE';
    if (category === 'Fair') return 'REVIEW';
    return 'APPROVE';
  };

  const getLatestLoanRequest = () => {
    if (client.loans?.loanHistory && client.loans.loanHistory.length > 0) {
      return [...client.loans.loanHistory].sort((a, b) =>
        new Date(b.dateApplied) - new Date(a.dateApplied)
      )[0];
    }
    return null;
  };

  const latestRequest = getLatestLoanRequest();
  return (
    <ScrollView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topbar}>
        <Text style={styles.logo}><Text style={{ color: '#0066ff' }}>Loan</Text>Siya</Text>
        <Text style={styles.role}>Loan Officer</Text>
    
      </View>

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

          <Text style={[styles.subTitle, { marginTop: 12 }]}>Uploaded Document</Text>
          {['Valid Id', 'ORCR', 'Land Title', 'Deeds of Assignment', 'Signed Documents'].map((doc, i) => (
            <View key={i} style={styles.documentRow}>
              <Text style={styles.docText}>{doc}</Text>
              <TouchableOpacity style={styles.viewBtn}><Text>View</Text></TouchableOpacity>
            </View>
          ))}
        </View>

        {/* RIGHT SIDE */}
        <View style={styles.right}>
          <Text style={styles.subTitle}>Financial Record</Text>
          <Text>Monthly Income: ₱{client.financial.monthlyIncome.toLocaleString()}</Text>
          <Text>Monthly Expenses: ₱{client.financial.monthlyExpenses.toLocaleString()}</Text>
          <Text>Saving and Assets: ₱{client.financial.assets.toLocaleString()}</Text>
          <Text>Debt to Income Ratio: {client.financial.dti}%</Text>

          <Text style={[styles.subTitle, { marginTop: 16 }]}>Employment or Business info</Text>
          <Text>{client.employer}</Text>
          <Text>{client.position}</Text>

          <Text style={[styles.subTitle, { marginTop: 16 }]}>Loan History</Text>
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => navigation.navigate('LoanHistory', {
              clientId: client.cid,
              userRole: 'loanofficer'
            })}
          >
            <Text>View</Text>
          </TouchableOpacity>

         <View style={styles.loanDetails}>
           <Text style={styles.subTitle}>Approved by Loan Officer</Text>
           <Text>₱{loanData?.approvedAmount || '0'}</Text>

           <Text style={styles.subTitle}>Recommended Loan Amount</Text>
           <Text>₱{loanData?.recommendedAmount || '0'}</Text>

           <Text style={styles.subTitle}>Purpose of Loan</Text>
           <Text>{loanData?.purpose || 'N/A'}</Text>

           <Text style={styles.subTitle}>Description of Purpose</Text>
           <Text>{loanData?.description || 'N/A'}</Text>

           <Text style={styles.subTitle}>Loan Term (in months)</Text>
           <Text>{loanData?.term || 'N/A'}</Text>

           <Text style={styles.subTitle}>Repayment Method</Text>
           <Text>{loanData?.repaymentMethod || 'Monthly'}</Text>

           <Text style={styles.subTitle}>Interest Rate</Text>
           <Text>{loanData?.interestRate || '5.0'}%</Text>

           <Text style={styles.subTitle}>Amount Due</Text>
           <Text>₱{loanData?.amountDue || '0'}</Text>

            {/* Show approval/decline status */}
            {loanData?.status && (
              <View style={[styles.approvalStatus, {
                backgroundColor: loanData.status === 'approved' ? '#e8f5e9' : '#ffebee',
                borderLeftColor: loanData.status === 'approved' ? '#2ecc71' : '#e74c3c'
              }]}>
                <Text style={[styles.approvalText, {
                  color: loanData.status === 'approved' ? '#2ecc71' : '#e74c3c'
                }]}>
                  {loanData.status.toUpperCase()} BY OPERATION MANAGER ON{' '}
                  {loanData.decidedAt ? new Date(loanData.decidedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  }) : 'YYYY/MM/DD'}
                </Text>
              </View>
            )}
          </View>


          <View style={styles.creditBox}>
           <Text style={[styles.subTitle, { marginBottom: 4 }]}>Credit Score</Text>
           <Text style={styles.creditScore}>{loanData?.creditScore || calculateScore()}</Text>
           
           <Text style={[styles.subTitle, { marginTop: 12 }]}>Risk Category</Text>
           <Text style={{
             color: ['Exceptional', 'Very Good', 'Good'].includes(loanData?.riskCategory || getRiskCategory(calculateScore())) ? '#2ecc71' : '#e74c3c'
           }}>{loanData?.riskCategory || getRiskCategory(calculateScore())}</Text>
           
           <Text style={[styles.subTitle, { marginTop: 12 }]}>Recommendation</Text>
           <Text style={{
             color: loanData?.recommendation === 'APPROVE' ? '#2ecc71' : '#e74c3c'
           }}>{loanData?.recommendation || (calculateScore() >= 670 ? 'Approved' : 'Not Approved')}</Text>
          </View>

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f6f6f6', flex: 1 },
  topbar: {
    flexDirection: 'row',
    backgroundColor: '#ddd',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  logo: { fontSize: 22, fontWeight: 'bold' },
  role: { fontSize: 14 },
  logout: { fontWeight: 'bold', fontSize: 14 },
  content: { flexDirection: 'row', padding: 20 },
  left: {
    flex: 1,
    marginRight: 10,
    paddingRight: 10,
    borderRightWidth: 1,
    borderColor: '#ccc',
  },
  right: {
    flex: 1.2,
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
    marginBottom: 4,
  },
  bold: {
    fontWeight: 'bold',
  },
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#eaeaea',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 4,
    borderRadius: 4,
  },
  docText: {
    fontSize: 13,
    color: '#333',
  },
  viewBtn: {
    backgroundColor: '#ccc',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  loanDetails: {
    marginTop: 20,
  },
  approvalStatus: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#2ecc71',
  },
  approvalText: {
    color: '#2ecc71',
    fontWeight: 'bold',
    fontSize: 14,
  },
  creditBox: {
    backgroundColor: '#eee',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  creditScore: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2ecc71',
    marginBottom: 8,
  },
  backBtn: {
    backgroundColor: '#ccc',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  backText: {
    fontWeight: 'bold',
    color: '#000',
  },
});
