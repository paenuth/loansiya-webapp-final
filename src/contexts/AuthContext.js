import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext({
  currentUser: null,
  setCurrentUser: () => {},
  resetPassword: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    // Try to get saved user from localStorage on init
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Update localStorage whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  const resetPassword = async (username, newPassword) => {
    // Validate inputs
    if (!username || !newPassword) {
      throw new Error('Username and new password are required');
    }

    // In a real app, this would make an API call to reset the password
    // For now, we'll just simulate the process
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate successful password reset
        resolve({
          success: true,
          message: 'Password reset successful'
        });
      }, 1000);
    });
  };

  const logout = () => {
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      setCurrentUser,
      resetPassword,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};