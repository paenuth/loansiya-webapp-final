import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { API_BASE_URL, clientAPI } from '../../services/api';

export default function DocumentPreviewScreen({ navigation, route }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { cid, title, documents, latestDate } = route.params;

  const renderDocumentPreview = (doc) => {
    const isPDF = doc.name.toLowerCase().endsWith('.pdf');

    return (
      <TouchableOpacity
        key={doc.name}
        style={styles.documentCard}
        onPress={async () => {
          try {
            const { url, type } = await clientAPI.viewDocumentByFilename(cid, doc.name, latestDate);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          } catch (error) {
            console.error('Error viewing document:', error);
            alert('Error viewing document. Please try again.');
          }
        }}
      >
        <View style={styles.previewContainer}>
          {isPDF ? (
            <View style={styles.pdfPreview}>
              <Text style={styles.pdfIcon}>PDF</Text>
            </View>
          ) : (
            <Image
              source={{ uri: `${API_BASE_URL}/documents/${cid}/thumbnail/${doc.name}?date=${encodeURIComponent(latestDate)}` }}
              style={styles.imagePreview}
              resizeMode="contain"
            />
          )}
        </View>
        <Text style={styles.documentName}>{doc.displayName}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#0066ff" />
        <Text style={styles.loadingText}>Loading documents...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{latestDate}</Text>
        </View>
      </View>

      {/* Document Grid */}
      <ScrollView style={styles.content}>
        <View style={styles.grid}>
          {documents.map(doc => renderDocumentPreview(doc))}
        </View>
      </ScrollView>
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
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
    paddingBottom: 20
  },
  headerContent: {
    flex: 1,
    marginLeft: 16
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  documentCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewContainer: {
    width: '100%',
    height: 150,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  pdfPreview: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  pdfIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
  },
  documentName: {
    padding: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
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
});