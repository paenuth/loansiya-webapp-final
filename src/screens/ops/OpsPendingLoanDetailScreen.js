import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Modal } from 'react-native';
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

export default function OpsPendingLoanDetailScreen({ navigation, route }) {
  const { updateLoan, updateLoanAmount } = useLoan();
  const [client, setClient] = useState(null);
  const [loanData, setLoanData] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedAmount, setEditedAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [latestRequest, setLatestRequest] = useState(null);

  const fetchLoanData = async (cid) => {
    try {
      const response = await fetch(`http://localhost:5600/client-loan-data/${cid}`);
      if (!response.ok) {
        throw new Error('Failed to fetch loan data');
      }
      const data = await response.json();
      setLoanData(data);
    } catch (err) {
      console.error('Error fetching loan data:', err);
      setError('Failed to fetch loan data');
    }
  };

  // Update latestRequest whenever client changes
  useEffect(() => {
    if (client?.loans?.loanHistory?.length > 0) {
      const latest = [...client.loans.loanHistory].sort((a, b) =>
        new Date(b.dateApplied) - new Date(a.dateApplied)
      )[0];
      setLatestRequest(latest);
    }
  }, [client]);

  useEffect(() => {
    if (route.params?.client) {
      const initialClient = {
        ...defaultClient,
        ...route.params.client
      };
      setClient(initialClient);
      
      // Fetch loan data when client is set
      if (initialClient.cid) {
        fetchLoanData(initialClient.cid);
      }
    }
  }, [route.params?.client]);

  if (!client) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const handleDecline = async () => {
try {
  setError('');
  console.log('Declining loan for CID:', client.cid);
  
  // First check if API is accessible
  try {
    const healthCheck = await fetch('http://localhost:5600/clients');
    if (!healthCheck.ok) {
      throw new Error('API server is not responding properly');
    }
  } catch (err) {
    throw new Error('API server is not running. Please start the credit-scoring-api server first.');
  }

  const result = await clientAPI.processLoanDecision(client.cid, 'declined');
  console.log('API Response:', result);
  
  await updateLoan(client.cid, {
    status: 'Declined',
    decidedAt: new Date().toISOString()
  });
  console.log('Local state updated');
  
  setSuccess('Loan application declined');
  setTimeout(() => {
    navigation.replace('OpsPendingList');
  }, 1000);
} catch (err) {
  console.error('Error declining loan:', err);
  setError(err.message || 'Failed to decline loan');
  setTimeout(() => setError(''), 3000); // Clear error after 3 seconds
}
};

  const handleApprove = async () => {
try {
  setError('');
  console.log('Approving loan for CID:', client.cid);
  
  // First check if API is accessible
  try {
    const healthCheck = await fetch('http://localhost:5600/clients');
    if (!healthCheck.ok) {
      throw new Error('API server is not responding properly');
    }
  } catch (err) {
    throw new Error('API server is not running. Please start the credit-scoring-api server first.');
  }

  // Save the current approved amount before approval
  const currentApprovedAmount = loanData?.approvedAmount || '0';

  const result = await clientAPI.processLoanDecision(client.cid, 'approved', {
    approvedAmount: loanData?.approvedAmount
  });
  console.log('API Response:', result);
  
  await updateLoan(client.cid, {
    status: 'Approved',
    decidedAt: new Date().toISOString(),
    approvedAmount: currentApprovedAmount
  });
  console.log('Local state updated');
  
  setSuccess('Loan application approved');
  setTimeout(() => {
    navigation.replace('OpsPendingList');
  }, 1000);
} catch (err) {
  console.error('Error approving loan:', err);
  setError(err.message || 'Failed to approve loan');
  setTimeout(() => setError(''), 3000); // Clear error after 3 seconds
}
};

  const handleSaveEdit = async () => {
    try {
      const newAmount = parseInt(editedAmount);
      
      if (!newAmount || newAmount <= 0) {
        setError('Please enter a valid amount');
        return;
      }
      
      if (client.loans?.loanHistory && client.loans.loanHistory.length > 0) {
        const latest = [...client.loans.loanHistory].sort((a, b) =>
          new Date(b.dateApplied) - new Date(a.dateApplied)
        )[0];
        
        if (newAmount > latest.amount) {
          setError(`Amount cannot exceed borrower's request of ₱${latest.amount.toLocaleString()}`);
          return;
        }

        // Calculate amount due (5% interest)
        const interest = newAmount * 0.05; // 5% interest
        const total = newAmount + interest;

        // Create updated latest request
        const updatedLatest = {
          ...latest,
          amount: newAmount,
          amountDue: {
            total
          }
        };

        // Create updated client data
        const updatedClient = {
          ...client,
          loans: {
            ...client.loans,
            loanHistory: client.loans.loanHistory.map(loan =>
              loan.dateApplied === latest.dateApplied ? updatedLatest : loan
            )
          }
        };
        
        await updateLoanAmount(client.cid, newAmount);
        setLatestRequest(updatedLatest); // Update latest request state immediately
        setClient(updatedClient);
        
        // Refresh loan data from API
        await fetchLoanData(client.cid);
        
        setShowEditModal(false);
        setSuccess('Loan amount updated successfully');
      }
    } catch (error) {
      setError('Failed to update loan amount');
      console.error('Error updating loan amount:', error);
    }
  };

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

  const getRiskCategory = (score) => {
    if (score >= 800) return 'Exceptional';
    if (score >= 740) return 'Very Good';
    if (score >= 670) return 'Good';
    if (score >= 580) return 'Fair';
    return 'Poor';
  };

  return (
    <ScrollView style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <Text style={styles.logo}><Text style={{ color: '#0066ff' }}>Loan</Text>Siya</Text>
        <Text style={styles.role}>Operations Manager</Text>
    
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
              <TouchableOpacity style={styles.viewBtn}>
                <Text>View</Text>
              </TouchableOpacity>
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
              userRole: 'ops'
            })}
          >
            <Text>View</Text>
          </TouchableOpacity>

          <View style={styles.loanDetails}>
            <Text style={styles.subTitle}>Approved by Loan Officer</Text>
            <Text>₱{loanData?.approvedAmount?.toLocaleString() || '0'}</Text>

            <Text style={styles.subTitle}>Recommended Loan Amount (Based on Credit Score)</Text>
            <Text>₱{loanData?.recommendedAmount?.toLocaleString() || '0'}</Text>

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

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => {
                const latestRequest = client.loans.loanHistory
                  .sort((a, b) => new Date(b.dateApplied) - new Date(a.dateApplied))[0];
                setEditedAmount(latestRequest?.amount.toString() || '0');
                setShowEditModal(true);
              }}
            >
              <Text>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={handleDecline}
            >
              <Text style={{ color: '#fff' }}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.approveBtn}
              onPress={handleApprove}
            >
              <Text style={{ color: '#fff' }}>Approve</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Loan Amount</Text>
            {client.loans.loanHistory.length > 0 && (
              <Text style={styles.modalSubtitle}>
                Maximum amount: ₱{
                  client.loans.loanHistory
                    .sort((a, b) => new Date(b.dateApplied) - new Date(a.dateApplied))[0]
                    .amount.toLocaleString()
                }
              </Text>
            )}
            
            <TextInput
              style={styles.amountInput}
              value={editedAmount}
              onChangeText={(text) => {
                setEditedAmount(text.replace(/[^0-9]/g, ''));
                setError('');
              }}
              keyboardType="numeric"
              placeholder="Enter amount"
            />
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowEditModal(false);
                  setError('');
                }}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveEdit}
              >
                <Text style={{ color: '#fff' }}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success/Error Messages */}
      {success ? (
        <View style={styles.successMessage}>
          <Text style={styles.successText}>{success}</Text>
        </View>
      ) : null}
      {error ? (
        <View style={styles.errorMessage}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    width: '80%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalSubtitle: {
    marginBottom: 15,
    color: '#666',
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    backgroundColor: '#ddd',
    padding: 10,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  errorText: {
    color: '#e74c3c',
    marginBottom: 10,
  },
  successMessage: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#2ecc71',
    padding: 10,
    borderRadius: 6,
  },
  successText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorMessage: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#e74c3c',
    padding: 10,
    borderRadius: 6,
  },
  container: { 
    backgroundColor: '#f6f6f6',
    flex: 1 
  },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ddd',
    padding: 20,
    alignItems: 'center',
  },
  logo: { fontSize: 22, fontWeight: 'bold' },
  role: { fontSize: 14 },
  logout: { fontWeight: 'bold', fontSize: 14 },
  content: { flexDirection: 'row', padding: 20 },
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
  creditBox: {
    backgroundColor: '#eee',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  creditScore: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2ecc71',
    marginBottom: 8,
  },
  loanBox: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    marginTop: 20,
    borderRadius: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  backBtn: {
    backgroundColor: '#ddd',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  editBtn: {
    backgroundColor: '#bbb',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  declineBtn: {
    backgroundColor: '#e74c3c',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  approveBtn: {
    backgroundColor: '#2ecc71',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
});
