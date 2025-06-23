import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions, ActivityIndicator, Alert } from 'react-native';
import { AuthContext } from '../../contexts/AuthContext';
import { useLoan } from '../../contexts/LoanContext';
import { clientAPI, API_BASE_URL } from '../../services/api';

export default function SignedAgreementPreview({ navigation, route }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const { currentUser } = useContext(AuthContext);
  const { updateLoan } = useLoan();
  
  const { client, loanData, signature, signerName } = route.params;

  useEffect(() => {
    generatePdfPreview();
  }, []);

  const generatePdfPreview = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Create the promissory note with signature
      const response = await fetch(`${API_BASE_URL}/generate-promissory-note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientData: {
            name: client.name,
            address: client.address,
            cid: client.cid
          },
          loanData: {
            approvedAmount: loanData?.approvedAmount || 0,
            interestRate: loanData?.interestRate || 5.0,
            term: loanData?.term || 12,
            repaymentMethod: loanData?.repaymentMethod || 'Monthly'
          },
          signature: signature,
          signerName: signerName || currentUser?.username || 'Operations Manager'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF preview. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const processApproval = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Starting loan approval process...');
      console.log('Client CID:', client.cid);
      console.log('Loan Data:', loanData);
      console.log('Signature present:', !!signature);
      console.log('Signer name:', signerName);
      
      // First check if API is accessible
      const healthCheck = await fetch(`${API_BASE_URL}/clients`);
      if (!healthCheck.ok) {
        throw new Error('API server is not responding properly');
      }

      console.log('API health check passed');

      // Process the loan approval with signature
      const { documents, ...clientWithoutDocuments } = client;
      const approvalData = {
        approvedAmount: loanData?.approvedAmount,
        signature: signature,
        signerName: signerName || currentUser?.username || 'Operations Manager',
        ...clientWithoutDocuments
      };

      console.log('Sending approval data to API...');

      const result = await clientAPI.processLoanDecision(client.cid, 'approved', approvalData);

      console.log('API Response:', result);
      
      // Update local state
      console.log('Updating local state...');
      await updateLoan(client.cid, {
        status: 'Approved',
        decidedAt: new Date().toISOString(),
        approvedAmount: loanData?.approvedAmount,
        signedBy: signerName || currentUser?.username || 'Operations Manager',
        signedAt: new Date().toISOString()
      });

      console.log('Local state updated successfully');

      // Stop loading before showing success alert
      setLoading(false);

      console.log('About to show success alert...');

      // Use custom modal instead of Alert for better web compatibility
      setTimeout(() => {
        console.log('Showing success dialog now...');
        setShowSuccessDialog(true);
      }, 100);

    } catch (err) {
      console.error('Error approving loan:', err);
      setLoading(false);
      setError(err.message || 'Failed to approve loan');
      
      // Show error alert
      Alert.alert(
        'Error',
        err.message || 'Failed to approve loan. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleApprove = () => {
    console.log('handleApprove called');
    setShowConfirmDialog(true);
  };

  const handleConfirmApproval = () => {
    console.log('User confirmed approval');
    setShowConfirmDialog(false);
    console.log('About to start processApproval...');
    processApproval();
  };

  const handleCancelApproval = () => {
    console.log('User cancelled approval');
    setShowConfirmDialog(false);
  };

  const handleSuccessOK = () => {
    console.log('Success dialog OK button pressed');
    console.log('Navigating back to OpsPendingList...');
    setShowSuccessDialog(false);
    
    // Navigate back to pending list with multiple fallback methods
    try {
      console.log('Attempting navigation reset...');
      navigation.reset({
        index: 0,
        routes: [{ name: 'OpsPendingList' }],
      });
      console.log('Navigation reset successful');
    } catch (err) {
      console.error('Reset navigation failed, trying replace:', err);
      try {
        navigation.replace('OpsPendingList');
        console.log('Navigation replace successful');
      } catch (err2) {
        console.error('Replace navigation failed, trying navigate:', err2);
        navigation.navigate('OpsPendingList');
        console.log('Navigation navigate attempted');
      }
    }
  };

  const handleBack = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#0066ff" />
        <Text style={[styles.loadingText, isMobile && styles.loadingTextMobile]}>
          {pdfUrl ? 'Processing loan approval...' : 'Generating PDF preview...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, isMobile && styles.titleMobile]}>
            <Text style={{ color: '#0066ff' }}>Loan</Text>Siya - Agreement Preview
          </Text>
          <Text style={[styles.subtitle, isMobile && styles.subtitleMobile]}>
            Review and approve the signed loan agreement
          </Text>
        </View>
      </View>

      {/* Agreement Details */}
      <View style={[styles.agreementDetails, isMobile && styles.agreementDetailsMobile]}>
        <Text style={[styles.detailsTitle, isMobile && styles.detailsTitleMobile]}>
          Agreement Summary
        </Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Client:</Text>
          <Text style={styles.detailValue}>{client.name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount:</Text>
          <Text style={styles.detailValue}>₱{loanData?.approvedAmount?.toLocaleString() || '0'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Signed By:</Text>
          <Text style={styles.detailValue}>{signerName || currentUser?.username || 'Operations Manager'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailValue}>{new Date().toLocaleDateString()}</Text>
        </View>
      </View>

      {/* PDF Preview */}
      <View style={[styles.pdfContainer, isMobile && styles.pdfContainerMobile]}>
        <Text style={[styles.pdfTitle, isMobile && styles.pdfTitleMobile]}>
          Signed Promissory Note Preview
        </Text>
        
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, isMobile && styles.errorTextMobile]}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={generatePdfPreview}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : pdfUrl ? (
          <View style={[styles.pdfPreview, isMobile && styles.pdfPreviewMobile]}>
            {Platform.OS === 'web' ? (
              isMobile ? (
                // Mobile web - show open in new tab option
                <View style={styles.mobilePdfContainer}>
                  <Text style={styles.mobilePdfText}>✓ PDF Generated Successfully</Text>
                  <Text style={styles.mobilePdfSubtext}>
                    Due to mobile browser limitations, please click below to view the signed agreement in a new tab.
                  </Text>
                  <TouchableOpacity
                    style={styles.viewPdfBtn}
                    onPress={() => window.open(pdfUrl, '_blank')}
                  >
                    <Text style={styles.viewPdfText}>Open Signed Agreement</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // Desktop web - show iframe
                <iframe
                  src={pdfUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: '8px'
                  }}
                  title="Signed Agreement Preview"
                />
              )
            ) : (
              <View style={styles.pdfPlaceholder}>
                <Text style={styles.pdfPlaceholderText}>PDF Preview Available</Text>
                <TouchableOpacity
                  style={styles.viewPdfBtn}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      window.open(pdfUrl, '_blank');
                    }
                  }}
                >
                  <Text style={styles.viewPdfText}>View PDF</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.pdfPlaceholder}>
            <Text style={styles.pdfPlaceholderText}>Loading PDF preview...</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={[styles.actionButtons, isMobile && styles.actionButtonsMobile]}>
        <TouchableOpacity
          style={[styles.backToSignBtn, isMobile && styles.buttonMobile]}
          onPress={handleBack}
        >
          <Text style={[styles.backToSignText, isMobile && styles.buttonTextMobile]}>
            Back to Signature
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.approveBtn, isMobile && styles.buttonMobile]}
          onPress={handleApprove}
          disabled={loading || !pdfUrl}
        >
          <Text style={[styles.approveText, isMobile && styles.buttonTextMobile]}>
            Approve & Complete
          </Text>
        </TouchableOpacity>
      </View>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmDialog, isMobile && styles.confirmDialogMobile]}>
            <Text style={[styles.confirmTitle, isMobile && styles.confirmTitleMobile]}>
              Confirm Approval
            </Text>
            <Text style={[styles.confirmMessage, isMobile && styles.confirmMessageMobile]}>
              This will approve the loan and generate the signed agreement. This action cannot be undone.
            </Text>
            <View style={[styles.confirmButtons, isMobile && styles.confirmButtonsMobile]}>
              <TouchableOpacity
                style={[styles.confirmCancelBtn, isMobile && styles.confirmButtonMobile]}
                onPress={handleCancelApproval}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmApproveBtn, isMobile && styles.confirmButtonMobile]}
                onPress={handleConfirmApproval}
              >
                <Text style={styles.confirmApproveText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Success Dialog */}
      {showSuccessDialog && (
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmDialog, isMobile && styles.confirmDialogMobile]}>
            <Text style={[styles.successTitle, isMobile && styles.confirmTitleMobile]}>
              Success
            </Text>
            <Text style={[styles.confirmMessage, isMobile && styles.confirmMessageMobile]}>
              Loan has been approved and signed agreement has been generated.
            </Text>
            <View style={[styles.confirmButtons, isMobile && styles.confirmButtonsMobile]}>
              <TouchableOpacity
                style={[styles.successOkBtn, isMobile && styles.confirmButtonMobile]}
                onPress={handleSuccessOK}
              >
                <Text style={styles.confirmApproveText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: Platform.select({ web: 20, default: 16 }),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerMobile: {
    padding: 12,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  backBtn: {
    marginRight: Platform.select({ web: 20, default: 12 }),
    padding: Platform.select({ web: 8, default: 6 }),
  },
  backText: {
    fontSize: Platform.select({ web: 16, default: 14 }),
    color: '#0066ff',
    fontWeight: '500',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: Platform.select({ web: 22, default: 18 }),
    fontWeight: 'bold',
    marginBottom: 4,
  },
  titleMobile: {
    fontSize: 16,
    marginTop: 8,
  },
  subtitle: {
    fontSize: Platform.select({ web: 14, default: 12 }),
    color: '#666',
  },
  subtitleMobile: {
    fontSize: 12,
  },
  agreementDetails: {
    backgroundColor: '#fff',
    margin: Platform.select({ web: 20, default: 16 }),
    padding: Platform.select({ web: 20, default: 16 }),
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  agreementDetailsMobile: {
    margin: 12,
    padding: 12,
  },
  detailsTitle: {
    fontSize: Platform.select({ web: 18, default: 16 }),
    fontWeight: 'bold',
    marginBottom: Platform.select({ web: 16, default: 12 }),
    color: '#333',
  },
  detailsTitleMobile: {
    fontSize: 14,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Platform.select({ web: 8, default: 6 }),
  },
  detailLabel: {
    fontSize: Platform.select({ web: 14, default: 13 }),
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: Platform.select({ web: 14, default: 13 }),
    color: '#333',
    fontWeight: '600',
  },
  pdfContainer: {
    backgroundColor: '#fff',
    marginHorizontal: Platform.select({ web: 20, default: 16 }),
    marginBottom: Platform.select({ web: 20, default: 16 }),
    padding: Platform.select({ web: 20, default: 16 }),
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flex: 1,
  },
  pdfContainerMobile: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 12,
  },
  pdfTitle: {
    fontSize: Platform.select({ web: 16, default: 14 }),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: Platform.select({ web: 12, default: 8 }),
  },
  pdfTitleMobile: {
    fontSize: 14,
  },
  pdfPreview: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  pdfPreviewMobile: {
    minHeight: 300,
  },
  pdfPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: Platform.select({ web: 400, default: 200 }),
  },
  pdfPlaceholderText: {
    fontSize: Platform.select({ web: 16, default: 14 }),
    color: '#666',
    marginBottom: 12,
  },
  mobilePdfContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 20,
    minHeight: 300,
  },
  mobilePdfText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2ecc71',
    marginBottom: 12,
    textAlign: 'center',
  },
  mobilePdfSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  viewPdfBtn: {
    backgroundColor: '#0066ff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewPdfText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: Platform.select({ web: 400, default: 200 }),
  },
  errorText: {
    color: '#e74c3c',
    fontSize: Platform.select({ web: 16, default: 14 }),
    marginBottom: 12,
    textAlign: 'center',
  },
  errorTextMobile: {
    fontSize: 14,
  },
  retryBtn: {
    backgroundColor: '#e74c3c',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: Platform.select({ web: 16, default: 14 }),
    color: '#666',
    textAlign: 'center',
  },
  loadingTextMobile: {
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.select({ web: 20, default: 16 }),
    paddingBottom: Platform.select({ web: 20, default: 16 }),
    gap: Platform.select({ web: 16, default: 12 }),
  },
  actionButtonsMobile: {
    flexDirection: 'column',
    paddingHorizontal: 12,
    gap: 10,
  },
  backToSignBtn: {
    backgroundColor: '#6c757d',
    paddingVertical: Platform.select({ web: 12, default: 10 }),
    paddingHorizontal: Platform.select({ web: 24, default: 20 }),
    borderRadius: 8,
    flex: Platform.select({ web: 1, default: 0 }),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.select({ web: 44, default: 48 }),
  },
  approveBtn: {
    backgroundColor: '#2ecc71',
    paddingVertical: Platform.select({ web: 12, default: 10 }),
    paddingHorizontal: Platform.select({ web: 24, default: 20 }),
    borderRadius: 8,
    flex: Platform.select({ web: 1, default: 0 }),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.select({ web: 44, default: 48 }),
  },
  buttonMobile: {
    width: '100%',
    minHeight: 48,
  },
  backToSignText: {
    color: '#fff',
    fontSize: Platform.select({ web: 16, default: 14 }),
    fontWeight: '600',
  },
  approveText: {
    color: '#fff',
    fontSize: Platform.select({ web: 16, default: 14 }),
    fontWeight: '600',
  },
  buttonTextMobile: {
    fontSize: 16,
  },
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  confirmDialog: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    width: '80%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmDialogMobile: {
    width: '90%',
    padding: 20,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmTitleMobile: {
    fontSize: 16,
  },
  confirmMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmMessageMobile: {
    fontSize: 14,
    marginBottom: 16,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  confirmButtonsMobile: {
    flexDirection: 'column',
    gap: 10,
  },
  confirmCancelBtn: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  confirmApproveBtn: {
    backgroundColor: '#2ecc71',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  confirmButtonMobile: {
    width: '100%',
    minHeight: 48,
  },
  confirmCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmApproveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2ecc71',
    marginBottom: 12,
    textAlign: 'center',
  },
  successOkBtn: {
    backgroundColor: '#2ecc71',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
});