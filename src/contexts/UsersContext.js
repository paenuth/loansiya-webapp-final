import React, { createContext, useState } from 'react';

export const UsersContext = createContext({
  users: [],
  addUser: (user) => {},
  updateUser: (user) => {},
});

export const UsersProvider = ({ children }) => {
  const [users, setUsers] = useState([
    {
      id: '1-sample1',
      username: 'officer1',
      fullName: 'Maron Brown',
      role: 'Officer',
      status: 'Active',
      password: 'password123',
      createdAt: '2025-01-01T00:00:00.000Z'
    },
    {
      id: '2-sample2',
      username: 'officer2',
      fullName: 'Vince Black',
      role: 'Officer',
      status: 'Active',
      password: 'password123',
      createdAt: '2025-01-01T00:00:00.000Z'
    },
    {
      id: '3-sample3',
      username: 'officer3',
      fullName: 'Hane White',
      role: 'Ops',
      status: 'Active',
      password: 'password123',
      createdAt: '2025-01-01T00:00:00.000Z'
    },
    {
      id: '4-sample4',
      username: 'officer4',
      fullName: 'Monke G',
      role: 'Officer',
      status: 'Disabled',
      password: 'password123',
      createdAt: '2025-01-01T00:00:00.000Z'
    }
  ]);

  const addUser = (user) => {
    // Validate required fields
    if (!user.username || !user.fullName) {
      throw new Error('Username and full name are required');
    }

    // Normalize input for validation
    const normalizedUsername = user.username.toLowerCase().trim();
    const normalizedFullName = user.fullName.toLowerCase().trim();

    // Check if username already exists
    const existingUsername = users.find(u => u.username.toLowerCase() === normalizedUsername);
    if (existingUsername) {
      throw new Error('Username already exists');
    }

    // Check if user with same name and role exists
    const existingNameAndRole = users.find(
      u => u.fullName.toLowerCase() === normalizedFullName &&
          u.role === user.role
    );
    if (existingNameAndRole) {
      throw new Error('A user with this name and role already exists');
    }

    // Generate unique ID with timestamp and random component
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create a clean user object with proper structure
    const newUser = {
      id: uniqueId,
      username: user.username.trim(),
      fullName: user.fullName.trim(),
      role: user.role,
      status: user.status || 'Active',
      password: user.password,
      createdAt: new Date().toISOString()
    };

    setUsers(prevUsers => [...prevUsers, newUser]);
  };

  const updateUser = (updatedUser) => {
    if (!updatedUser.id) {
      throw new Error('User ID is required for updating');
    }
    
    // Find the target user by ID first
    const targetUser = users.find(u => u.id === updatedUser.id);
    if (!targetUser) {
      throw new Error('User not found');
    }

    // For simple status updates, skip validation
    if (Object.keys(updatedUser).length === 2 && updatedUser.status) {
      setUsers(prevUsers =>
        prevUsers.map(user => {
          if (user.id === updatedUser.id) {
            return {
              ...user,
              status: updatedUser.status,
              updatedAt: new Date().toISOString()
            };
          }
          return user;
        })
      );
      return;
    }

    // For other updates, perform validation
    const normalizedUsername = updatedUser.username ? updatedUser.username.toLowerCase().trim() : targetUser.username.toLowerCase();
    const normalizedFullName = updatedUser.fullName ? updatedUser.fullName.toLowerCase().trim() : targetUser.fullName.toLowerCase();

    // Only check for username duplicates if username is being changed
    if (updatedUser.username && updatedUser.username.trim() !== targetUser.username) {
      const existingUser = users.find(u =>
        u.id !== targetUser.id &&
        u.username.toLowerCase() === normalizedUsername
      );
      if (existingUser) {
        throw new Error('Username already exists');
      }
    }

    // Check for duplicate name and role if those fields are being changed
    if ((updatedUser.fullName && updatedUser.fullName.trim() !== targetUser.fullName) ||
        (updatedUser.role && updatedUser.role !== targetUser.role)) {
      const existingNameAndRole = users.find(u =>
        u.id !== targetUser.id &&
        u.fullName.toLowerCase() === normalizedFullName &&
        u.role === (updatedUser.role || targetUser.role)
      );
      if (existingNameAndRole) {
        throw new Error('A user with this name and role already exists');
      }
    }

    // Create a clean updated user object
    const cleanUpdatedUser = {
      ...targetUser, // Start with existing user data
      ...updatedUser, // Apply updates
      id: targetUser.id, // Ensure ID remains unchanged
      updatedAt: new Date().toISOString()
    };

    // Trim string fields if they exist
    if (cleanUpdatedUser.username) {
      cleanUpdatedUser.username = cleanUpdatedUser.username.trim();
    }
    if (cleanUpdatedUser.fullName) {
      cleanUpdatedUser.fullName = cleanUpdatedUser.fullName.trim();
    }

    // Update the specific user
    setUsers(prevUsers =>
      prevUsers.map(user => {
        if (user.id === targetUser.id) {
          return cleanUpdatedUser;
        }
        return user;
      })
    );
  };

  return (
    <UsersContext.Provider value={{
      users,
      addUser,
      updateUser,
    }}>
      {children}
    </UsersContext.Provider>
  );
};