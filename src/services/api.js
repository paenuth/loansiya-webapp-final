import Constants from 'expo-constants';

// Get API URL with multiple fallback strategies for different environments
const getApiUrl = () => {
  // Debug logging
  console.log('Environment debug info:', {
    NODE_ENV: process.env.NODE_ENV,
    REACT_APP_API_URL: process.env.REACT_APP_API_URL,
    expoConfig: Constants.expoConfig?.extra?.REACT_APP_API_URL,
    isProduction: process.env.NODE_ENV === 'production'
  });
  
  // For production builds, prioritize environment variables
  if (process.env.NODE_ENV === 'production' && process.env.REACT_APP_API_URL) {
    console.log('Using production env var:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // For Expo builds, use Constants
  if (Constants.expoConfig?.extra?.REACT_APP_API_URL) {
    console.log('Using Expo config:', Constants.expoConfig.extra.REACT_APP_API_URL);
    return Constants.expoConfig.extra.REACT_APP_API_URL;
  }
  
  // Fallback to environment variable
  if (process.env.REACT_APP_API_URL) {
    console.log('Using env var fallback:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // Development fallback
  console.log('Using localhost fallback');
  return 'http://localhost:5600';
};

export const API_BASE_URL = getApiUrl();

// Authentication API endpoints
export const authAPI = {
  login: async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/officers/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Login failed');
      }

      // Map the officer data to the expected user format
      return {
        user: {
          username: data.officer.username,
          fullName: data.officer.fullName,
          role: data.officer.role, // Use the role directly from backend
          status: data.officer.status
        }
      };
    } catch (error) {
      console.error('Login Error:', error);
      throw error;
    }
  }
};

// User Management API endpoints
export const userAPI = {
  // Get all users
  getAllUsers: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Update user status
  updateUserStatus: async (username, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${username}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        throw new Error('Failed to update user status');
      }
      return response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Add new user
  addUser: async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add user');
      }
      return response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Update user
  updateUser: async (username, userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${username}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }
      return response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
};

// Document type mapping for API requests
const DOCUMENT_TYPE_MAP = {
  'Valid Id': 'validid',
  'ORCR': 'orcr',
  'Land Title': 'landtitle',
  'Deeds of Assignment': 'deed',
  'Promissory Note': 'promissory-note'
};

// Document categories
export const DOCUMENT_CATEGORIES = {
  APPLICATION_DOCS: ['Valid Id', 'ORCR', 'Land Title', 'Deeds of Assignment'],
  SIGNED_DOCS: ['Promissory Note', 'Signed Agreement']
};

export const clientAPI = {
  // Get all clients from the Credit Scoring API
  getAllClients: async () => {
    try {
      console.log('Fetching clients from:', API_BASE_URL);
      const response = await fetch(`${API_BASE_URL}/clients`);
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      return response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Get single client by CID
  getClientById: async (cid) => {
    try {
      const response = await fetch(`${API_BASE_URL}/client/${cid}`);
      if (!response.ok) {
        throw new Error('Failed to fetch client');
      }
      return response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Get client score data
  getClientScore: async (cid) => {
    try {
      const response = await fetch(`${API_BASE_URL}/score/${cid}`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch client score');
      }
      return response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Process client metrics
  processMetrics: async (cid) => {
    try {
      const response = await fetch(`${API_BASE_URL}/metrics/${cid}`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Failed to process metrics');
      }
      return response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Process loan decision (approve/decline)
  processLoanDecision: async (cid, decision, additionalData = {}) => {
    try {
      const response = await fetch(`${API_BASE_URL}/loan/${cid}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ decision, ...additionalData })
      });
      if (!response.ok) {
        throw new Error('Failed to process loan decision');
      }
      return response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Fetch client loan data
  fetchClientLoanData: async (cid) => {
    try {
      const response = await fetch(`${API_BASE_URL}/client-loan-data/${cid}`);
      if (!response.ok) {
        throw new Error('Failed to fetch loan data');
      }
      return response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Update loan amount
  updateLoanAmount: async (cid, amount) => {
    try {
      const response = await fetch(`${API_BASE_URL}/loan/${cid}/amount`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      });
      if (!response.ok) {
        throw new Error('Failed to update loan amount');
      }
      return response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Notification endpoints
  notifications: {
    // Get notifications for the current user
    getNotifications: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications`);
        if (!response.ok) {
          throw new Error('Failed to fetch notifications');
        }
        return response.json();
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    },

    // Create a new notification
    createNotification: async (notification) => {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(notification)
        });
        if (!response.ok) {
          throw new Error('Failed to create notification');
        }
        return response.json();
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    },

    // Mark notifications as read
    markAsRead: async (notificationIds) => {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications/mark-read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ notificationIds })
        });
        if (!response.ok) {
          throw new Error('Failed to mark notifications as read');
        }
        return response.json();
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    }
  },

  // View client document by specific filename
  viewDocumentByFilename: async (cid, filename, date = null) => {
    try {
      // Pad CID with leading zeros
      const paddedCid = cid.toString().padStart(3, '0');

      // Use the new endpoint that takes specific filename
      console.log('Fetching document file:', filename, 'for CID:', paddedCid, 'date:', date);
      
      // Build URL with optional date parameter
      let url = `${API_BASE_URL}/documents/${paddedCid}/file/${encodeURIComponent(filename)}`;
      if (date) {
        url += `?date=${encodeURIComponent(date)}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch document');
      }
      
      // Get content type from response headers
      const contentType = response.headers.get('content-type');
      const blob = await response.blob();
      
      // Create object URL for preview
      const objectUrl = URL.createObjectURL(new Blob([blob], { type: contentType }));
      return {
        url: objectUrl,
        type: contentType
      };
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // View client document with preview support (legacy - uses document type)
  viewDocument: async (cid, documentType) => {
    try {
      // Pad CID with leading zeros
      const paddedCid = cid.toString().padStart(3, '0');

      // Map document type to internal type
      const internalType = DOCUMENT_TYPE_MAP[documentType];
      if (!internalType) {
        throw new Error(`Invalid document type: ${documentType}`);
      }

      // Encode the internal type for URL safety
      const encodedType = encodeURIComponent(internalType);
      console.log('Fetching document:', documentType, 'as', internalType, 'for CID:', paddedCid);
      const response = await fetch(`${API_BASE_URL}/documents/${paddedCid}/${encodedType}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch document');
      }
      
      // Get content type from response headers
      const contentType = response.headers.get('content-type');
      const blob = await response.blob();
      
      // Create object URL for preview
      const objectUrl = URL.createObjectURL(new Blob([blob], { type: contentType }));
      return {
        url: objectUrl,
        type: contentType
      };
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Get all documents from latest folder
  getLatestDocuments: async (cid) => {
    try {
      // Pad CID with leading zeros to match GCS folder structure (e.g., '1' -> '001')
      const paddedCid = cid.toString().padStart(3, '0');
      console.log('Getting documents for padded CID:', paddedCid);
      const response = await fetch(`${API_BASE_URL}/documents/${paddedCid}/all`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch documents');
      }

      const data = await response.json();
      return data.documents;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Get all document dates for a client
  getDocumentDates: async (cid) => {
    try {
      // Pad CID with leading zeros to match GCS folder structure
      const paddedCid = cid.toString().padStart(3, '0');
      console.log('Getting document dates for padded CID:', paddedCid);
      const response = await fetch(`${API_BASE_URL}/documents/${paddedCid}/dates`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch document dates');
      }

      const data = await response.json();
      return data.dates;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Get documents from specific date folder
  getDocumentsByDate: async (cid, date) => {
    try {
      // Pad CID with leading zeros
      const paddedCid = cid.toString().padStart(3, '0');
      console.log('Getting documents for padded CID:', paddedCid, 'date:', date);
      const response = await fetch(`${API_BASE_URL}/documents/${paddedCid}/date/${date}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch documents');
      }

      const data = await response.json();
      return data.documents;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
};