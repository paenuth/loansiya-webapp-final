const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5600';

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
  }
};