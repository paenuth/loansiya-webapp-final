import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, useWindowDimensions, Platform } from 'react-native';
import { useLoan } from '../../contexts/LoanContext';
import { clientAPI, API_BASE_URL } from '../../services/api';

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
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);
  const { loans, refreshClientData } = useLoan();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const fetchLoanData = async (cid) => {
    try {
      // First check if API is accessible
      try {
        const healthCheck = await fetch(`${API_BASE_URL}/clients`);
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
        <Text style={[styles.role, isMobile && styles.roleMobile]}>Loan Officer</Text>
      </View>

      <View style={[styles.content, isMobile && styles.contentMobile]}>
        {/* LEFT SIDE */}
        <View style={[styles.left, isMobile && styles.leftMobile, isMobile && { marginBottom: '20%' }]}>
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

          <Text style={[styles.subTitle, { marginTop: isMobile ? 8 : 12, marginBottom: isMobile ? 4 : 6 }]}>
            Uploaded Documents
          </Text>
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

          <View style={styles.documentCategory}>
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
        <View style={[styles.right, isMobile && styles.rightMobile, isMobile && { marginTop: '-370px' }]}>
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

          <Text style={[styles.subTitle, { marginTop: isMobile ? 8 : 16, marginBottom: isMobile ? 4 : 6 }]}>
            Loan History
          </Text>
          <TouchableOpacity
            style={[styles.viewBtn, isMobile && styles.viewBtnMobile]}
            onPress={() => navigation.navigate('LoanHistory', {
              clientId: client.cid,
              userRole: 'loanofficer',
              fromPendingDetail: true
            })}
          >
            <Text style={{color: '#fff', fontWeight: '600', fontSize: 16}}>View History</Text>
          </TouchableOpacity>

          <View style={[styles.loanDetails, isMobile && styles.loanDetailsMobile]}>
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
          </View>

          <View style={[styles.creditBox, isMobile && styles.creditBoxMobile]}>
            <Text style={[styles.subTitle, { marginBottom: 4 }]}>Credit Score</Text>
            <Text style={styles.creditScore}>{loanData?.creditScore || calculateScore()}</Text>
            
            <Text style={[styles.subTitle, { marginTop: 12 }]}>Risk Category</Text>
            <Text style={{
              color: ['Exceptional', 'Very Good', 'Good'].includes(
                loanData?.riskCategory || getRiskCategory(calculateScore())
              ) ? '#2ecc71' : '#e74c3c'
            }}>
              {loanData?.riskCategory || getRiskCategory(calculateScore())}
            </Text>
            
            <Text style={[styles.subTitle, { marginTop: 12 }]}>Recommendation</Text>
            <Text style={{
              color: loanData?.recommendation === 'APPROVE' ? '#2ecc71' : '#e74c3c'
            }}>
              {loanData?.recommendation || (calculateScore() >= 670 ? 'Approved' : 'Not Approved')}
            </Text>
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
    position: 'relative',
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
    marginBottom: '25%',
    position: 'relative',
    zIndex: 1,
  },
  right: {
    flex: Platform.select({ web: 1.3, default: 1 }),
    paddingLeft: Platform.select({ web: 20, default: 0 }),
    minWidth: Platform.select({ web: 300, default: '100%' })
  },
  rightMobile: {
    width: '100%',
    paddingLeft: 0,
    marginTop: '-40%',
    position: 'relative',
    zIndex: 0,
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
  sectionTitleMobile: {
    fontSize: 16,
  },
  subTitle: {
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 4,
  },
  bold: {
    fontWeight: 'bold',
  },
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
  viewBtnMobile: {
    width: '100%',
    paddingVertical: 14,
    minHeight: 48,
  },
  loanDetails: {
    backgroundColor: '#f8f9fa',
    padding: Platform.select({ web: 20, default: 16 }),
    borderRadius: 8,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  loanDetailsMobile: {
    padding: 12,
    marginTop: 12,
  },
  creditBox: {
    backgroundColor: '#f8f9fa',
    padding: Platform.select({ web: 20, default: 16 }),
    borderRadius: 8,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  creditBoxMobile: {
    padding: 12,
    marginTop: 12,
  },
  creditScore: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2ecc71',
    marginBottom: 8,
  },
  backBtn: {
    backgroundColor: '#ddd',
    paddingVertical: Platform.select({ web: 10, default: 12 }),
    paddingHorizontal: Platform.select({ web: 20, default: 16 }),
    borderRadius: 6,
    marginTop: 20,
    alignItems: 'center',
    width: '100%',
  },
  backText: {
    fontSize: 16,
    color: '#333',
  },
});
