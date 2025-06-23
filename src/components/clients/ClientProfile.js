import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal, useWindowDimensions, Platform } from 'react-native';
import { useLoan } from '../../contexts/LoanContext';
import { DOCUMENT_CATEGORIES } from '../../services/api';
import { sharedStyles } from '../../styles/shared';
import { formatDateForDisplay } from '../../utils/dateFormatters';
import { loadApplicationDocumentDates, loadSignedDocumentDates, getApplicationDocuments, getSignedDocuments } from '../../utils/documentHandlers';

const defaultClient = {
  name: 'N/A',
  age: 0,
  cid: '',
  email: 'N/A',
  number: 'N/A',
  address: 'N/A',
  documents: {
    applicationDocs: DOCUMENT_CATEGORIES.APPLICATION_DOCS,
    signedDocuments: []
  },
  financial: {
    monthlyIncome: 0,
    monthlyExpenses: 0,
    assets: 0,
    dti: 0
  },
  employer: 'N/A',
  position: 'N/A'
};

export default function ClientProfile({ 
  navigation, 
  route,
  userRole = 'loanofficer' 
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [documentDates, setDocumentDates] = useState([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [modalType, setModalType] = useState('application');
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
      
      const documents = {
        applicationDocs: clientData.documents?.applicationDocs || defaultClient.documents.applicationDocs,
        signedDocuments: clientData.documents?.signedDocuments || []
      };

      setClient({
        ...defaultClient,
        ...clientData,
        documents
      });
    } catch (err) {
      console.error('Error loading client:', err);
      setError('Failed to load client data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDocumentDates = async (type) => {
    try {
      setLoadingDates(true);
      setModalType(type);
      const dates = type === 'application' 
        ? await loadApplicationDocumentDates(cid)
        : await loadSignedDocumentDates(cid);
      setDocumentDates(dates);
      setShowDateModal(true);
    } catch (error) {
      alert(`Error loading ${type} document dates. Please try again.`);
    } finally {
      setLoadingDates(false);
    }
  };

  const handleDateSelection = async (selectedDate) => {
    try {
      setShowDateModal(false);
      const documents = modalType === 'application'
        ? await getApplicationDocuments(client.cid, selectedDate)
        : await getSignedDocuments(client.cid, selectedDate);

      if (documents.length > 0) {
        navigation.navigate('DocumentPreview', {
          cid: client.cid,
          title: `${modalType === 'application' ? 'Application' : 'Signed'} Documents - ${formatDateForDisplay(selectedDate)}`,
          documents,
          latestDate: selectedDate
        });
      } else {
        alert(`No ${modalType} documents found for the selected date`);
      }
    } catch (error) {
      alert(`Error loading ${modalType} documents. Please try again.`);
    }
  };

  if (loading) {
    return (
      <View style={[sharedStyles.container, sharedStyles.centerContent]}>
        <ActivityIndicator size="large" color="#0066ff" />
        <Text style={sharedStyles.loadingText}>Loading client data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[sharedStyles.container, sharedStyles.centerContent]}>
        <Text style={sharedStyles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadClientData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={[sharedStyles.container, sharedStyles.centerContent]}>
        <Text style={sharedStyles.errorText}>Client not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back to List</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={[sharedStyles.container, !isMobile && sharedStyles.containerDesktop]}>
      <View style={[sharedStyles.content, isMobile && sharedStyles.contentMobile]}>
        {/* LEFT SIDE */}
        <View style={[sharedStyles.section, isMobile && sharedStyles.sectionMobile]}>
          <Text style={styles.sectionTitle}>Client Profile</Text>
          <Text style={styles.subTitle}>Personal Details</Text>
          <View style={styles.detailsContainer}>
            <Text><Text style={styles.bold}>Name:</Text> {client.name}</Text>
            <Text><Text style={styles.bold}>Age:</Text> {client.age}</Text>
            <Text><Text style={styles.bold}>CID:</Text> {client.cid}</Text>
            <Text><Text style={styles.bold}>Email:</Text> {client.email}</Text>
            <Text><Text style={styles.bold}>Number:</Text> {client.number}</Text>
            <Text><Text style={styles.bold}>Address:</Text> {client.address}</Text>
          </View>

          <Text style={[styles.subTitle, { marginTop: 16 }]}>Uploaded Documents</Text>
          
          <View style={styles.documentCategory}>
            <Text style={styles.categoryText}>Application Documents</Text>
            <TouchableOpacity
              style={styles.previewBtn}
              onPress={() => handleLoadDocumentDates('application')}
              disabled={loadingDates}
            >
              <Text style={styles.previewText}>
                {loadingDates ? 'Loading...' : 'View'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.documentCategory}>
            <Text style={styles.categoryText}>Signed Documents</Text>
            <TouchableOpacity
              style={styles.previewBtn}
              onPress={() => handleLoadDocumentDates('signed')}
              disabled={loadingDates}
            >
              <Text style={styles.previewText}>
                {loadingDates ? 'Loading...' : 'View'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* RIGHT SIDE */}
        <View style={[sharedStyles.section, isMobile && sharedStyles.sectionMobile]}>
          <View style={styles.financialContainer}>
            <Text style={styles.sectionTitle}>Financial Record</Text>
            <View style={styles.financialDetails}>
              <Text style={styles.financialItem}>Monthly Income ₱{client.financial.monthlyIncome.toLocaleString()}</Text>
              <Text style={styles.financialItem}>Monthly Expenses ₱{client.financial.monthlyExpenses.toLocaleString()}</Text>
              <Text style={styles.financialItem}>Saving and Assets ₱{client.financial.assets.toLocaleString()}</Text>
              <Text style={styles.financialItem}>Debt to Income Ratio {client.financial.dti}%</Text>
            </View>
          </View>

          <View style={styles.employmentContainer}>
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Employment or Business info</Text>
            <View style={styles.employmentDetails}>
              <Text style={styles.employmentItem}>{client.employer}</Text>
              <Text style={styles.employmentItem}>{client.position}</Text>
            </View>
          </View>

          <View style={styles.loanHistoryContainer}>
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Loan History</Text>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => navigation.navigate('LoanHistory', {
                clientId: client.cid,
                userRole
              })}
            >
              <Text style={styles.viewBtnText}>View History</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backBtnText}>← Back to List</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.refreshBtn} onPress={loadClientData}>
              <Text style={styles.actionBtnText}>↻ Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Date Selection Modal */}
      <Modal
        visible={showDateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={sharedStyles.modal.overlay}>
          <View style={[sharedStyles.modal.content, isMobile && sharedStyles.modal.contentMobile]}>
            <Text style={sharedStyles.modal.title}>
              Select {modalType === 'application' ? 'Application' : 'Signed'} Document Date
            </Text>
            
            {documentDates.length > 0 ? (
              documentDates.map((dateInfo, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.dateButton}
                  onPress={() => handleDateSelection(dateInfo.date)}
                >
                  <Text style={styles.dateButtonText}>
                    📅 {formatDateForDisplay(dateInfo.date)}
                  </Text>
                  <Text style={styles.documentCountText}>
                    ({dateInfo.documentCount} documents)
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noDataText}>No document dates found</Text>
            )}
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDateModal(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: Platform.select({ web: 18, default: 16 }),
    marginBottom: 10,
    color: '#333',
  },
  subTitle: {
    fontWeight: 'bold',
    fontSize: Platform.select({ web: 16, default: 14 }),
    marginTop: 10,
    marginBottom: 6,
    color: '#444',
  },
  detailsContainer: {
    backgroundColor: '#fff',
    padding: Platform.select({ web: 16, default: 12 }),
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  bold: {
    fontWeight: 'bold',
  },
  documentCategory: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: Platform.select({ web: 16, default: 12 }),
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryText: {
    fontSize: Platform.select({ web: 15, default: 14 }),
    color: '#333',
    fontWeight: '500',
  },
  financialContainer: {
    marginBottom: 16,
  },
  financialDetails: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  financialItem: {
    fontSize: Platform.select({ web: 15, default: 14 }),
    color: '#333',
    paddingVertical: 2,
  },
  employmentContainer: {
    marginBottom: 16,
  },
  employmentDetails: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    gap: 6,
    marginTop: 8,
  },
  employmentItem: {
    fontSize: Platform.select({ web: 15, default: 14 }),
    color: '#333',
    paddingVertical: 2,
  },
  loanHistoryContainer: {
    marginBottom: 20,
  },
  viewBtn: {
    ...sharedStyles.button.primaryButton,
    marginTop: 8,
  },
  viewBtnText: {
    ...sharedStyles.button.buttonText,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    gap: 10,
    flexWrap: 'wrap',
  },
  backBtn: {
    ...sharedStyles.button.secondaryButton,
    flex: 1,
    maxWidth: Platform.select({ web: 'auto', default: '48%' }),
    alignItems: 'center',
  },
  refreshBtn: {
    backgroundColor: '#28a745',
    paddingVertical: Platform.select({ web: 10, default: 10 }),
    paddingHorizontal: Platform.select({ web: 16, default: 16 }),
    borderRadius: 8,
    flex: 1,
    maxWidth: Platform.select({ web: 'auto', default: '48%' }),
    alignItems: 'center',
  },
  backBtnText: {
    ...sharedStyles.button.buttonTextSecondary,
  },
  actionBtnText: {
    ...sharedStyles.button.buttonText,
  },
  dateButton: {
    backgroundColor: '#f8f9fa',
    padding: Platform.select({ web: 15, default: 12 }),
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: Platform.select({ web: 16, default: 14 }),
    color: '#333',
    fontWeight: '500',
  },
  documentCountText: {
    fontSize: Platform.select({ web: 14, default: 12 }),
    color: '#666',
    fontStyle: 'italic',
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginVertical: 20,
  },
  previewBtn: {
    backgroundColor: '#0066ff',
    paddingVertical: Platform.select({ web: 8, default: 6 }),
    paddingHorizontal: Platform.select({ web: 16, default: 12 }),
    borderRadius: 6,
  },
  previewText: {
    color: '#fff',
    fontSize: Platform.select({ web: 14, default: 12 }),
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: '#dc3545',
    padding: Platform.select({ web: 12, default: 10 }),
    borderRadius: 8,
    marginTop: 15,
  },
  closeButtonText: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: 'white',
    fontSize: Platform.select({ web: 16, default: 14 }),
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
  }
});