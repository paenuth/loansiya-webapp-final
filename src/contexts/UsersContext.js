import React, { createContext, useState, useEffect } from 'react';
import { userAPI } from '../services/api';

export const UsersContext = createContext({
  users: [],
  loading: false,
  addUser: (user) => {},
  updateUser: (user) => {},
  refreshUsers: () => {},
});

export const UsersProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch users from GCS on component mount
  const refreshUsers = async () => {
    try {
      setLoading(true);
      const fetchedUsers = await userAPI.getAllUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Keep existing users if fetch fails
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const addUser = async (user) => {
    try {
      // Validate required fields
      if (!user.username || !user.fullName || !user.role || !user.password) {
        throw new Error('Username, full name, role, and password are required');
      }

      setLoading(true);
      const response = await userAPI.addUser(user);
      
      // Refresh users list to get updated data from GCS
      await refreshUsers();
      
      return response.user;
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (updatedUser) => {
    try {
      if (!updatedUser.id && !updatedUser.username) {
        throw new Error('User ID or username is required for updating');
      }
      
      const username = updatedUser.username || updatedUser.id;
      
      setLoading(true);

      // For simple status updates
      if (Object.keys(updatedUser).length === 2 && updatedUser.status) {
        await userAPI.updateUserStatus(username, updatedUser.status);
      } else {
        // For full user updates
        const updateData = {};
        if (updatedUser.fullName) updateData.fullName = updatedUser.fullName;
        if (updatedUser.role) updateData.role = updatedUser.role;
        if (updatedUser.status) updateData.status = updatedUser.status;
        if (updatedUser.password) updateData.password = updatedUser.password;
        
        await userAPI.updateUser(username, updateData);
      }
      
      // Refresh users list to get updated data from GCS
      await refreshUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <UsersContext.Provider value={{
      users,
      loading,
      addUser,
      updateUser,
      refreshUsers,
    }}>
      {children}
    </UsersContext.Provider>
  );
};