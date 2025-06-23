import React, { useState, useRef, useContext, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions, Alert } from 'react-native';
import { AuthContext } from '../../contexts/AuthContext';

// Import CSS for signature canvas enhancement (web only)
if (Platform.OS === 'web') {
  require('./signature-styles.css');
}

// Import signature canvas based on platform
let SignatureCanvas;
if (Platform.OS === 'web') {
  SignatureCanvas = require('react-signature-canvas').default;
} else {
  SignatureCanvas = require('react-native-signature-canvas').default;
}

export default function SignatureAgreementScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const signatureRef = useRef();
  const [signature, setSignature] = useState('');
  const [isSignatureCaptured, setIsSignatureCaptured] = useState(false);
  const { currentUser } = useContext(AuthContext);
  
  const { client, loanData } = route.params;


  const handleSignature = (signature) => {
    console.log('Signature captured');
    setSignature(signature);
    setIsSignatureCaptured(true);
  };

  const handleEmpty = () => {
    console.log('Signature is empty');
    Alert.alert('Empty Signature', 'Please provide a signature before proceeding.');
  };

  const handleClear = () => {
    console.log('Clearing signature');
    if (Platform.OS === 'web') {
      signatureRef.current.clear();
    } else {
      signatureRef.current.clearSignature();
    }
    setSignature('');
    setIsSignatureCaptured(false);
  };

  const handleSave = () => {
    if (Platform.OS === 'web') {
      const signatureData = signatureRef.current.toDataURL();
      handleSignature(signatureData);
    } else {
      // For mobile, this will be handled by the canvas onOK callback
    }
  };

  const handleConfirm = () => {
    if (!isSignatureCaptured) {
      Alert.alert('No Signature', 'Please provide a signature before proceeding.');
      return;
    }
    
    // Navigate to preview screen with signature data
    navigation.navigate('SignedAgreementPreview', {
      client,
      loanData,
      signature,
      signerName: currentUser?.username || 'Operations Manager'
    });
  };

  // Web-specific signature canvas styles - simplified for proper sizing
  const canvasStyle = {
    border: 'none', // Remove border since container has border
    borderRadius: '6px',
    backgroundColor: '#fff',
    width: '100%',
    height: '100%',
    display: 'block'
  };

  // Canvas properties - let it fill container naturally
  const canvasProps = {
    style: canvasStyle,
    className: 'signature-canvas'
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, isMobile && styles.titleMobile]}>
            <Text style={{ color: '#0066ff' }}>Loan</Text>Siya - Agreement Signature
          </Text>
          <Text style={[styles.subtitle, isMobile && styles.subtitleMobile]}>
            Client: {client.name} | Amount: ₱{loanData?.approvedAmount?.toLocaleString() || '0'}
          </Text>
        </View>
      </View>

      {/* Agreement Summary */}
      <View style={[styles.agreementSummary, isMobile && styles.agreementSummaryMobile]}>
        <Text style={[styles.summaryTitle, isMobile && styles.summaryTitleMobile]}>
          Loan Agreement Summary
        </Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Client Name:</Text>
          <Text style={styles.summaryValue}>{client.name}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Loan Amount:</Text>
          <Text style={styles.summaryValue}>₱{loanData?.approvedAmount?.toLocaleString() || '0'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Interest Rate:</Text>
          <Text style={styles.summaryValue}>{loanData?.interestRate || '5.0'}%</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Term:</Text>
          <Text style={styles.summaryValue}>{loanData?.term || 'N/A'} months</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Repayment Method:</Text>
          <Text style={styles.summaryValue}>{loanData?.repaymentMethod || 'Monthly'}</Text>
        </View>
      </View>

      {/* Signature Instructions */}
      <View style={[styles.instructionsContainer, isMobile && styles.instructionsContainerMobile]}>
        <Text style={[styles.instructionsTitle, isMobile && styles.instructionsTitleMobile]}>
          Digital Signature Required
        </Text>
        <Text style={[styles.instructionsText, isMobile && styles.instructionsTextMobile]}>
          As the Operations Manager, please sign below to approve this loan agreement. 
          Your signature will be embedded in the promissory note document.
        </Text>
      </View>

      {/* Signature Canvas */}
      <View style={[styles.signatureContainer, isMobile && styles.signatureContainerMobile]}>
        <Text style={[styles.signatureLabel, isMobile && styles.signatureLabelMobile]}>
          Operations Manager Signature:
        </Text>
        <View style={[styles.signatureCanvas, isMobile && styles.signatureCanvasMobile]}>
          {Platform.OS === 'web' ? (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={canvasProps}
                penColor="#000000"
                backgroundColor="#ffffff"
                dotSize={1.5}
                minWidth={0.8}
                maxWidth={2.5}
                throttle={12}
                velocityFilterWeight={0.8}
                onEnd={() => {
                  // Don't auto-capture to prevent clearing
                  // User will need to manually capture like mobile
                }}
              />
              {/* Manual capture button for web */}
              <div style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px'
              }}>
                <button
                  onClick={() => {
                    if (signatureRef.current && !signatureRef.current.isEmpty()) {
                      // Capture at native canvas resolution for best quality
                      const signatureData = signatureRef.current.toDataURL('image/png');
                      handleSignature(signatureData);
                    }
                  }}
                  style={{
                    backgroundColor: '#2ecc71',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <SignatureCanvas
              ref={signatureRef}
              onOK={handleSignature}
              onEmpty={handleEmpty}
              descriptionText=""
              clearText="Clear"
              confirmText="Save"
              autoClear={false}
              imageType="image/png"
              penColor="#000000"
              backgroundColor="#ffffff"
              minWidth={1}
              maxWidth={3}
              webStyle={`
                .m-signature-pad {
                  position: relative;
                  font-size: 10px;
                  width: 100%;
                  height: 100%;
                  border: 2px solid #ddd;
                  border-radius: 8px;
                  background-color: #fff;
                }
                .m-signature-pad--body {
                  position: relative;
                  overflow: hidden;
                  width: 100%;
                  height: 100%;
                }
                .m-signature-pad--body canvas {
                  position: relative;
                  left: 0;
                  top: 0;
                  width: 100%;
                  height: 100%;
                  touch-action: none;
                  background-color: #fff;
                }
                .m-signature-pad--footer {
                  position: absolute;
                  left: 20px;
                  right: 20px;
                  bottom: 20px;
                  height: 40px;
                }
                .m-signature-pad--footer .clear,
                .m-signature-pad--footer .save {
                  float: left;
                  margin: 0 5px 5px 0;
                  background: #0066ff;
                  color: #fff;
                  border: none;
                  border-radius: 4px;
                  padding: 8px 12px;
                  cursor: pointer;
                  font-size: 12px;
                }
                .m-signature-pad--footer .clear {
                  background: #e74c3c;
                }
              `}
            />
          )}
        </View>
        
        {/* Signature Status */}
        {isSignatureCaptured && (
          <Text style={[styles.signatureStatus, isMobile && styles.signatureStatusMobile]}>
            ✓ Signature captured successfully
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={[styles.actionButtons, isMobile && styles.actionButtonsMobile]}>
        <TouchableOpacity
          style={[styles.clearButton, isMobile && styles.buttonMobile]}
          onPress={handleClear}
        >
          <Text style={[styles.clearButtonText, isMobile && styles.buttonTextMobile]}>
            Clear Signature
          </Text>
        </TouchableOpacity>

        
        <TouchableOpacity
          style={[
            styles.confirmButton,
            isMobile && styles.buttonMobile,
            !isSignatureCaptured && styles.disabledButton
          ]}
          onPress={handleConfirm}
          disabled={!isSignatureCaptured}
        >
          <Text style={[
            styles.confirmButtonText,
            isMobile && styles.buttonTextMobile,
            !isSignatureCaptured && styles.disabledButtonText
          ]}>
            Preview Agreement
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f6',
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
  agreementSummary: {
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
  agreementSummaryMobile: {
    margin: 12,
    padding: 12,
  },
  summaryTitle: {
    fontSize: Platform.select({ web: 18, default: 16 }),
    fontWeight: 'bold',
    marginBottom: Platform.select({ web: 16, default: 12 }),
    color: '#333',
  },
  summaryTitleMobile: {
    fontSize: 14,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Platform.select({ web: 8, default: 6 }),
  },
  summaryLabel: {
    fontSize: Platform.select({ web: 14, default: 13 }),
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: Platform.select({ web: 14, default: 13 }),
    color: '#333',
    fontWeight: '600',
  },
  instructionsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: Platform.select({ web: 20, default: 16 }),
    marginBottom: Platform.select({ web: 20, default: 16 }),
    padding: Platform.select({ web: 20, default: 16 }),
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0066ff',
  },
  instructionsContainerMobile: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 12,
  },
  instructionsTitle: {
    fontSize: Platform.select({ web: 16, default: 14 }),
    fontWeight: 'bold',
    color: '#0066ff',
    marginBottom: Platform.select({ web: 8, default: 6 }),
  },
  instructionsTitleMobile: {
    fontSize: 14,
  },
  instructionsText: {
    fontSize: Platform.select({ web: 14, default: 13 }),
    color: '#555',
    lineHeight: Platform.select({ web: 20, default: 18 }),
  },
  instructionsTextMobile: {
    fontSize: 12,
    lineHeight: 16,
  },
  signatureContainer: {
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
  },
  signatureContainerMobile: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 12,
  },
  signatureLabel: {
    fontSize: Platform.select({ web: 16, default: 14 }),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: Platform.select({ web: 12, default: 8 }),
  },
  signatureLabelMobile: {
    fontSize: 14,
  },
  signatureCanvas: {
    height: Platform.select({ web: 300, default: 200 }),
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
    position: 'relative',
  },
  signatureCanvasMobile: {
    height: 180,
  },
  signatureStatus: {
    marginTop: Platform.select({ web: 12, default: 8 }),
    fontSize: Platform.select({ web: 14, default: 12 }),
    color: '#2ecc71',
    fontWeight: '600',
    textAlign: 'center',
  },
  signatureStatusMobile: {
    fontSize: 12,
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
  clearButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: Platform.select({ web: 12, default: 10 }),
    paddingHorizontal: Platform.select({ web: 24, default: 20 }),
    borderRadius: 8,
    flex: Platform.select({ web: 1, default: 0 }),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.select({ web: 44, default: 48 }),
  },
  saveButton: {
    backgroundColor: '#3498db',
    paddingVertical: Platform.select({ web: 12, default: 10 }),
    paddingHorizontal: Platform.select({ web: 24, default: 20 }),
    borderRadius: 8,
    flex: Platform.select({ web: 1, default: 0 }),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.select({ web: 44, default: 48 }),
  },
  confirmButton: {
    backgroundColor: '#2ecc71',
    paddingVertical: Platform.select({ web: 12, default: 10 }),
    paddingHorizontal: Platform.select({ web: 24, default: 20 }),
    borderRadius: 8,
    flex: Platform.select({ web: 1, default: 0 }),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.select({ web: 44, default: 48 }),
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  buttonMobile: {
    width: '100%',
    minHeight: 48,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: Platform.select({ web: 16, default: 14 }),
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: Platform.select({ web: 16, default: 14 }),
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: Platform.select({ web: 16, default: 14 }),
    fontWeight: '600',
  },
  disabledButtonText: {
    color: '#95a5a6',
  },
  buttonTextMobile: {
    fontSize: 16,
  },
});