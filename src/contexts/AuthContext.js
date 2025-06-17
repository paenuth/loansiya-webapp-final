import { createContext, useState } from 'react';

export const AuthContext = createContext({
  currentUser: null,
  setCurrentUser: () => {},
  resetPassword: () => {},
});

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);

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

  return (
    <AuthContext.Provider value={{
      currentUser,
      setCurrentUser,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};