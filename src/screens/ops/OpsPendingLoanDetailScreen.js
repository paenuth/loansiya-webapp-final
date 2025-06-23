import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Modal, useWindowDimensions, Platform } from 'react-native';
import { useLoan } from '../../contexts/LoanContext';
import { AuthContext } from '../../contexts/AuthContext';
import { clientAPI, API_BASE_URL, DOCUMENT_CATEGORIES } from '../../services/api';

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
  },
  documents: {
    applicationDocs: DOCUMENT_CATEGORIES.APPLICATION_DOCS,
    signedDocuments: []
  }
};

export default function OpsPendingLoanDetailScreen({ navigation, route }) {
  const { updateLoan, updateLoanAmount } = useLoan();
  const { currentUser } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [client, setClient] = useState(null);
  const [loanData, setLoanData] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedAmount, setEditedAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [latestRequest, setLatestRequest] = useState(null);

  const fetchLoanData = async (cid) => {
    try {
      const response = await fetch(`${API_BASE_URL}/client-loan-data/${cid}`);
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
    console.log('Route params:', route.params);
    if (route.params?.client) {
      console.log('Initializing client with:', route.params.client);
      const initialClient = {
        ...defaultClient,
        ...route.params.client,
        documents: {
          applicationDocs: route.params.client.documents?.applicationDocs || defaultClient.documents.applicationDocs,
          signedDocuments: route.params.client.documents?.signedDocuments || []
        }
      };
      console.log('Setting client with CID:', initialClient.cid);
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
    const healthCheck = await fetch(`${API_BASE_URL}/clients`);
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
        const healthCheck = await fetch(`${API_BASE_URL}/clients`);
        if (!healthCheck.ok) {
          throw new Error('API server is not responding properly');
        }
      } catch (err) {
        throw new Error('API server is not running. Please start the credit-scoring-api server first.');
      }

      // Save the current approved amount before approval
      const currentApprovedAmount = loanData?.approvedAmount || '0';

      // Exclude "documents" from the client object
      const { documents, ...clientWithoutDocuments } = client;

      const result = await clientAPI.processLoanDecision(client.cid, 'approved', {
        approvedAmount: loanData?.approvedAmount,
        ...clientWithoutDocuments
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
      
      const maxAmount = loanData?.approvedAmount || 0;
      
      if (newAmount > maxAmount) {
        setError(`Amount cannot exceed approved amount of ₱${maxAmount.toLocaleString()}`);
        return;
      }

      if (client.loans?.loanHistory && client.loans.loanHistory.length > 0) {
        const latest = [...client.loans.loanHistory].sort((a, b) =>
          new Date(b.dateApplied) - new Date(a.dateApplied)
        )[0];

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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Topbar */}
      <View style={[styles.topbar, isMobile && styles.topbarMobile]}>
        <Text style={[styles.logo, isMobile && styles.logoMobile]}>
          <Text style={{ color: '#0066ff' }}>Loan</Text>Siya
        </Text>
        <Text style={[styles.role, isMobile && styles.roleMobile]}>
          {currentUser?.role === 'ops' ? 'Operations Manager' : currentUser?.username || 'Operations Manager'}
        </Text>
      </View>

      <View style={[styles.content, isMobile && styles.contentMobile]}>
        {/* LEFT SIDE */}
        <View style={[styles.left, isMobile && styles.leftMobile, isMobile && { marginBottom: '25%' }]}>
          <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>Client Profile</Text>
          <View style={styles.detailsContainer}>
            <Text style={styles.subTitle}>Personal Details</Text>
            <Text><Text style={styles.bold}>Name:</Text> {client.name}</Text>
            <Text><Text style={styles.bold}>Age:</Text> {client.age}</Text>
            <Text><Text style={styles.bold}>CID:</Text> {client.cid}</Text>
            <Text><Text style={styles.bold}>Email:</Text> {client.email}</Text>
            <Text><Text style={styles.bold}>Number:</Text> {client.number}</Text>
            <Text><Text style={styles.bold}>Address:</Text> {client.address}</Text>
          </View>

          <Text style={[styles.subTitle, { marginTop: isMobile ? 8 : 12, marginBottom: isMobile ? 4 : 6 }]}>Uploaded Documents</Text>
          <View style={styles.documentCategory}>
            <Text style={styles.categoryText}>Application Documents</Text>
            <TouchableOpacity
              style={styles.previewBtn}
              onPress={async () => {
                try {
                  if (!client.cid) {
                    console.error('No client CID available');
                    alert('Error: Client ID not found');
                    return;
                  }

                  // Get all document dates and find the latest one with application documents
                  const allDates = await clientAPI.getDocumentDates(client.cid);
                  
                  if (allDates.length === 0) {
                    alert('No documents found for this client.');
                    return;
                  }

                  // Sort dates in descending order (latest first)
                  const sortedDates = allDates.sort((a, b) => b.date.localeCompare(a.date));
                  
                  let latestApplicationDocs = [];
                  let latestDate = null;

                  // Find the latest date that has application documents (non-PDF files)
                  for (const dateInfo of sortedDates) {
                    const documents = await clientAPI.getDocumentsByDate(client.cid, dateInfo.date);
                    const applicationDocs = documents.filter(doc => {
                      const name = doc.name?.toLowerCase() || '';
                      return !name.endsWith('.pdf'); // Non-PDF files are application documents
                    });

                    if (applicationDocs.length > 0) {
                      latestApplicationDocs = applicationDocs;
                      latestDate = dateInfo.date;
                      break;
                    }
                  }

                  if (latestApplicationDocs.length > 0) {
                    navigation.navigate('DocumentPreview', {
                      cid: client.cid,
                      title: 'Application Documents',
                      documents: latestApplicationDocs,
                      latestDate: latestDate
                    });
                  } else {
                    alert('No application documents found');
                  }
                } catch (error) {
                  console.error('Error loading documents:', error);
                  alert('Error loading documents. Please try again.');
                }
              }}
            >
              <Text style={styles.previewText}>View</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.documentCategory, { marginBottom: isMobile ? 4 : 10 }]}>
            <Text style={styles.categoryText}>Signed Documents</Text>
            <TouchableOpacity
              style={styles.previewBtn}
              onPress={async () => {
                try {
                  // Get all document dates and find the latest one with signed documents
                  const allDates = await clientAPI.getDocumentDates(client.cid);
                  
                  if (allDates.length === 0) {
                    alert('No documents found for this client.');
                    return;
                  }

                  // Sort dates in descending order (latest first)
                  const sortedDates = allDates.sort((a, b) => b.date.localeCompare(a.date));
                  
                  let latestSignedDocs = [];
                  let latestDate = null;

                  // Find the latest date that has signed documents
                  for (const dateInfo of sortedDates) {
                    const documents = await clientAPI.getDocumentsByDate(client.cid, dateInfo.date);
                    const signedDocs = documents.filter(doc => {
                      const name = doc.name?.toLowerCase() || '';
                      return name.endsWith('.pdf');
                    });

                    if (signedDocs.length > 0) {
                      latestSignedDocs = signedDocs;
                      latestDate = dateInfo.date;
                      break;
                    }
                  }

                  if (latestSignedDocs.length > 0) {
                    // Map documents with proper display names
                    const mappedDocs = latestSignedDocs.map(doc => ({
                      ...doc,
                      displayName: doc.name.includes('promissory-note') ? 'Promissory Note' : 'Signed Agreement'
                    }));

                    // Navigate to DocumentPreview screen
                    navigation.navigate('DocumentPreview', {
                      cid: client.cid,
                      title: 'Signed Documents',
                      documents: mappedDocs,
                      latestDate: latestDate
                    });
                  } else {
                    alert('No signed documents found. Documents will be available after loan approval.');
                  }
                } catch (error) {
                  console.error('Error loading documents:', error);
                  alert('Error loading documents. Please try again.');
                }
              }}
            >
              <Text style={styles.previewText}>View</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* RIGHT SIDE */}
        <View style={[styles.right, isMobile && styles.rightMobile, isMobile && { marginTop: '-450px' }]}>
          <View style={styles.detailsContainer}>
            <Text style={styles.subTitle}>Financial Record</Text>
            <Text>Monthly Income: ₱{client.financial.monthlyIncome.toLocaleString()}</Text>
            <Text>Monthly Expenses: ₱{client.financial.monthlyExpenses.toLocaleString()}</Text>
            <Text>Saving and Assets: ₱{client.financial.assets.toLocaleString()}</Text>
            <Text>Debt to Income Ratio: {client.financial.dti}%</Text>
          </View>

          <View style={[styles.detailsContainer, { marginTop: 16 }]}>
            <Text style={styles.subTitle}>Employment or Business info</Text>
            <Text>{client.employer}</Text>
            <Text>{client.position}</Text>
          </View>

          <Text style={[styles.subTitle, { marginTop: isMobile ? 8 : 16 }]}>Loan History</Text>
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => navigation.navigate('LoanHistory', {
              clientId: client.cid,
              userRole: 'ops',
              fromPendingDetail: true
            })}
          >
            <Text style={{color: '#fff', fontWeight: '600', fontSize: 16}}>View History</Text>
          </TouchableOpacity>

          <View style={[styles.loanDetails, isMobile && { marginTop: 8 }]}>
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
          <View style={[styles.actionRow, isMobile && styles.actionRowMobile]}>
            <TouchableOpacity
              style={[styles.backBtn, isMobile && styles.btnMobile]}
              onPress={() => navigation.goBack()}>
              <Text>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editBtn, isMobile && styles.btnMobile]}
              onPress={() => {
                const maxAmount = loanData?.approvedAmount?.toString() || '0';
                setEditedAmount(maxAmount);
                setShowEditModal(true);
              }}
            >
              <Text>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.declineBtn, isMobile && styles.btnMobile]}
              onPress={handleDecline}
            >
              <Text style={{ color: '#fff' }}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.approveBtn, isMobile && styles.btnMobile]}
              onPress={() => navigation.navigate('SignatureAgreement', { client, loanData })}
            >
              <Text style={{ color: '#fff' }}>Sign Agreement</Text>
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
          <View style={[styles.modalContent, isMobile && styles.modalContentMobile]}>
            <Text style={[styles.modalTitle, isMobile && styles.modalTitleMobile]}>Edit Loan Amount</Text>
            <Text style={[styles.modalSubtitle, isMobile && styles.modalSubtitleMobile]}>
              Maximum amount: ₱{loanData?.approvedAmount?.toLocaleString() || '0'}
            </Text>
            
            <TextInput
              style={[styles.amountInput, isMobile && styles.amountInputMobile]}
              value={editedAmount}
              onChangeText={(text) => {
                setEditedAmount(text.replace(/[^0-9]/g, ''));
                setError('');
              }}
              keyboardType="numeric"
              placeholder="Enter amount"
              placeholderTextColor="#999"
            />
            
            {error ? <Text style={[styles.errorText, isMobile && styles.errorTextMobile]}>{error}</Text> : null}
            
            <View style={[styles.modalButtons, isMobile && styles.modalButtonsMobile]}>
              <TouchableOpacity
                style={[styles.cancelBtn, isMobile && styles.cancelBtnMobile]}
                onPress={() => {
                  setShowEditModal(false);
                  setError('');
                }}
              >
                <Text style={[styles.modalButtonText, isMobile && styles.modalButtonTextMobile]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.saveBtn, isMobile && styles.saveBtnMobile]}
                onPress={handleSaveEdit}
              >
                <Text style={[styles.modalButtonTextWhite, isMobile && styles.modalButtonTextWhiteMobile]}>Save Changes</Text>
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
  // Document Category Styles
  documentCategory: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    marginBottom: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  previewBtn: {
    backgroundColor: '#0066ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  previewText: {
    color: '#fff',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: Platform.select({ web: 24, default: 20 }),
    borderRadius: 8,
    width: Platform.select({ web: '80%', default: '90%' }),
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalContentMobile: {
    padding: 16,
    width: '95%',
    margin: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalTitleMobile: {
    fontSize: 16,
  },
  modalSubtitle: {
    marginBottom: 15,
    color: '#666',
    textAlign: 'center',
  },
  modalSubtitleMobile: {
    fontSize: 14,
    marginBottom: 12,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  amountInputMobile: {
    padding: 15,
    fontSize: 16,
    minHeight: 48,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButtonsMobile: {
    flexDirection: 'column',
    gap: 10,
  },
  cancelBtn: {
    backgroundColor: '#ddd',
    padding: 12,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelBtnMobile: {
    width: '100%',
// Detail Styles
  detailRow: {
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  detailLabelMobile: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 14,
    color: '#555',
    flexWrap: 'wrap',
  },
  detailValueMobile: {
    fontSize: 14,
    lineHeight: 20,
  },
  personalDetailsGrid: {
    gap: 8,
  },
  personalDetailsGridMobile: {
    gap: 6,
  },
  financialGrid: {
    gap: 8,
  },
  employmentGrid: {
    gap: 8,
  },

  // Loan Details
  loanDetails: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  loanDetailsMobile: {
    padding: 12,
    marginTop: 12,
  },
  loanDetailRow: {
    marginBottom: 12,
  },
  loanDetailValue: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
    fontWeight: '500',
  },
  loanDetailValueMobile: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Loan History Section
  loanHistorySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  loanHistorySectionMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },

  // View Button
  viewBtn: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
  },
  viewBtnMobile: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    minHeight: 48,
    alignSelf: 'stretch',
    backgroundColor: '#0066ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewBtnText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  viewBtnTextMobile: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Section Titles
  sectionTitleMobile: {
    fontSize: 16,
  },
  subTitleMobile: {
    fontSize: 14,
  },

  // Details Container
  detailsContainerMobile: {
    padding: 12,
    marginBottom: 12,
  },

  // Credit Box
  creditBoxMobile: {
    padding: 12,
    marginTop: 12,
  },
  creditScoreMobile: {
    fontSize: 28,
    marginBottom: 6,
  },
  riskCategoryMobile: {
    fontSize: 14,
    fontWeight: '600',
  },
  recommendationMobile: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Action Buttons
  actionRowMobile: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 16,
  },
  backBtnMobile: {
    width: '100%',
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  editBtnMobile: {
    width: '100%',
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: '#6c757d',
  },
  declineBtnMobile: {
    width: '100%',
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  approveBtnMobile: {
    width: '100%',
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonTextMobile: {
    fontSize: 16,
  },
  buttonTextWhite: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonTextWhiteMobile: {
    fontSize: 16,
  },

  // Error Text
  errorTextMobile: {
    fontSize: 14,
    textAlign: 'center',
  },
    minHeight: 48,
  },
  saveBtn: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  saveBtnMobile: {
    width: '100%',
    minHeight: 48,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalButtonTextMobile: {
    fontSize: 16,
  },
  modalButtonTextWhite: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  modalButtonTextWhiteMobile: {
    fontSize: 16,
  },
  documentButton: {
    backgroundColor: '#ffffff',
    padding: Platform.select({ web: 16, default: 14 }),
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  documentButtonText: {
    fontSize: Platform.select({ web: 16, default: 15 }),
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#f8f9fa',
    padding: Platform.select({ web: 16, default: 14 }),
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  closeButtonText: {
    color: '#333',
    fontSize: Platform.select({ web: 16, default: 15 }),
    fontWeight: '500',
    textAlign: 'center',
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
    padding: Platform.select({ web: 20, default: 16 }),
    alignItems: 'center',
  },
  topbarMobile: {
    padding: 12,
  },
  logo: {
    fontSize: Platform.select({ web: 22, default: 20 }),
    fontWeight: 'bold'
  },
  logoMobile: {
    fontSize: 18,
  },
  role: {
    fontSize: Platform.select({ web: 14, default: 12 })
  },
  roleMobile: {
    fontSize: 12,
  },
  content: {
    flexDirection: 'row',
    padding: Platform.select({ web: 20, default: 16 }),
    flexWrap: Platform.select({ web: 'nowrap', default: 'wrap' })
  },
  contentMobile: {
    flexDirection: 'column',
    padding: 12,
    gap: 0,
  },
  left: {
    flex: Platform.select({ web: 1.1, default: 1 }),
    paddingRight: Platform.select({ web: 20, default: 0 }),
    borderRightWidth: Platform.select({ web: 1, default: 0 }),
    borderColor: '#ccc',
    minWidth: Platform.select({ web: 300, default: '100%' }),
    marginBottom: Platform.select({ web: 0, default: 0 })
  },
  leftMobile: {
    width: '100%',
    paddingRight: 0,
    borderRightWidth: 0,
    marginBottom: 0,
  },
  right: {
    flex: Platform.select({ web: 1.3, default: 1 }),
    paddingLeft: Platform.select({ web: 20, default: 0 }),
    minWidth: Platform.select({ web: 300, default: '100%' })
  },
  rightMobile: {
    width: '100%',
    paddingLeft: 0,
    marginTop: 0,
  },
  detailsContainer: {
    backgroundColor: '#fff',
    padding: Platform.select({ web: 20, default: 16 }),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
    width: '100%',
    alignSelf: 'stretch',
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
    backgroundColor: '#0066ff',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  creditBox: {
    backgroundColor: '#f8f9fa',
    padding: Platform.select({ web: 20, default: 16 }),
    borderRadius: 8,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    gap: Platform.select({ web: 12, default: 8 }),
    marginTop: 20,
    flexWrap: 'wrap',
    alignItems: 'center',
    width: '100%',
  },
  actionRowMobile: {
    justifyContent: 'space-between',
    gap: 8,
    flexDirection: Platform.select({ web: 'row', default: 'column' }),
  },
  btnMobile: {
    width: '100%',
    marginVertical: 4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  backBtn: {
    backgroundColor: '#ddd',
    paddingVertical: Platform.select({ web: 8, default: 6 }),
    paddingHorizontal: Platform.select({ web: 16, default: 12 }),
    borderRadius: 6,
  },
  editBtn: {
    backgroundColor: '#bbb',
    paddingVertical: Platform.select({ web: 8, default: 6 }),
    paddingHorizontal: Platform.select({ web: 16, default: 12 }),
    borderRadius: 6,
  },
  declineBtn: {
    backgroundColor: '#e74c3c',
    paddingVertical: Platform.select({ web: 8, default: 6 }),
    paddingHorizontal: Platform.select({ web: 16, default: 12 }),
    borderRadius: 6,
  },
  approveBtn: {
    backgroundColor: '#2ecc71',
    paddingVertical: Platform.select({ web: 8, default: 6 }),
    paddingHorizontal: Platform.select({ web: 16, default: 12 }),
    borderRadius: 6,
  },
});
