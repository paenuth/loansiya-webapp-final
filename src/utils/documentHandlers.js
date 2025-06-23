import { clientAPI } from '../services/api';

export const loadApplicationDocumentDates = async (cid) => {
  try {
    const dates = await clientAPI.getDocumentDates(cid);
    const filteredDates = [];
    
    for (const dateInfo of dates) {
      const documents = await clientAPI.getDocumentsByDate(cid, dateInfo.date);
      const applicationDocs = documents.filter(doc =>
        !['pdf', 'signed-promissory-note'].some(keyword =>
          doc.type.includes(keyword) ||
          doc.name.toLowerCase().includes(keyword) ||
          doc.displayName.toLowerCase().includes(keyword)
        )
      );
    
      if (applicationDocs.length > 0) {
        filteredDates.push({
          ...dateInfo,
          documentCount: applicationDocs.length
        });
      }
    }
    return filteredDates;
  } catch (error) {
    console.error('Error loading document dates:', error);
    throw new Error('Failed to load document dates');
  }
};

export const loadSignedDocumentDates = async (cid) => {
  try {
    const dates = await clientAPI.getDocumentDates(cid);
    const datesWithSignedDocs = [];
    
    for (const dateInfo of dates) {
      const documents = await clientAPI.getDocumentsByDate(cid, dateInfo.date);
      const signedDocs = documents.filter(doc => {
        const name = (doc.name || '').toLowerCase();
        const displayName = (doc.displayName || '').toLowerCase();
        const type = (doc.type || '').toLowerCase();
        
        const isPDF = type.includes('pdf') ||
          name.endsWith('.pdf') ||
          displayName.endsWith('.pdf');
          
        const isPromissoryNote = name.includes('signed-promissory-note') ||
          displayName.includes('signed-promissory note');
        
        return isPDF || isPromissoryNote;
      });
      
      if (signedDocs.length > 0) {
        datesWithSignedDocs.push({
          ...dateInfo,
          documentCount: signedDocs.length
        });
      }
    }
    return datesWithSignedDocs;
  } catch (error) {
    console.error('Error loading signed document dates:', error);
    throw new Error('Failed to load signed document dates');
  }
};

export const getApplicationDocuments = async (cid, selectedDate) => {
  try {
    const documents = await clientAPI.getDocumentsByDate(cid, selectedDate);
    return documents.filter(doc =>
      !['pdf', 'signed-promissory-note'].some(keyword =>
        doc.type.includes(keyword) ||
        doc.name.toLowerCase().includes(keyword) ||
        doc.displayName.toLowerCase().includes(keyword)
      )
    );
  } catch (error) {
    console.error('Error loading documents:', error);
    throw new Error('Failed to load application documents');
  }
};

export const getSignedDocuments = async (cid, selectedDate) => {
  try {
    const documents = await clientAPI.getDocumentsByDate(cid, selectedDate);
    return documents.filter(doc => {
      const name = (doc.name || '').toLowerCase();
      const displayName = (doc.displayName || '').toLowerCase();
      const type = (doc.type || '').toLowerCase();
      
      const isPDF = type.includes('pdf') ||
        name.endsWith('.pdf') ||
        displayName.endsWith('.pdf');
        
      const isPromissoryNote = name.includes('signed-promissory-note') ||
        displayName.includes('signed-promissory note');
      
      return isPDF || isPromissoryNote;
    });
  } catch (error) {
    console.error('Error loading signed documents:', error);
    throw new Error('Failed to load signed documents');
  }
};