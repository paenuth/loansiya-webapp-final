require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const { Storage } = require('@google-cloud/storage');
const { generatePromissoryNote } = require('./pdfGenerator');
const app = express();
const PORT = process.env.PORT || 5600;
const metricsRoute = require('./metricsRoute');
const notificationsRoute = require('./notificationsRoute');

// Use environment variable for credentials path
const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

// Use environment variable for bucket name
const bucket = storage.bucket(process.env.GCS_BUCKET);

app.use(cors());
app.use(express.json());
app.use(metricsRoute);
app.use(notificationsRoute);

// ========================
// AUTHENTICATION ROUTES
// ========================

// Universal login endpoint for all user types
app.post('/officers/login', async (req, res) => {
  const { username, password } = req.body;

  console.log(`🔐 Login attempt for username: ${username}`);

  try {
    // Validate input
    if (!username || !password) {
      console.log('❌ Missing username or password');
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const accountsBucket = storage.bucket('loansiya-accounts');
    
    // Define user files to check with role mapping
    const userFiles = [
      { file: 'loan_officers.json', defaultRole: 'LOAN_OFFICER' },
      { file: 'ops_managers.json', defaultRole: 'OPS_MANAGER' },
      { file: 'it_admins.json', defaultRole: 'IT_ADMIN' }
    ];

    // Role mapping from display names to codes
    const roleMapping = {
      'Loan Officer': 'LOAN_OFFICER',
      'OPS_MANAGER': 'OPS_MANAGER',
      'IT_ADMIN': 'IT_ADMIN'
    };

    let foundUser = null;

    // Search through all user files
    for (const userFileInfo of userFiles) {
      try {
        console.log(`📥 Checking ${userFileInfo.file}...`);
        const [file] = await accountsBucket.file(userFileInfo.file).download();
        const users = JSON.parse(file.toString());
        
        const user = users.find((u) => u.username === username);
        if (user) {
          // Map role to frontend-expected format
          let mappedRole = roleMapping[user.role] || userFileInfo.defaultRole;
          
          foundUser = {
            ...user,
            role: mappedRole
          };
          console.log(`👤 Found user in ${userFileInfo.file} with role: ${mappedRole}`);
          break;
        }
      } catch (fileError) {
        console.log(`⚠️  ${userFileInfo.file} not found or error reading: ${fileError.message}`);
        continue; // Continue to next file if this one doesn't exist
      }
    }

    if (!foundUser) {
      console.log(`❌ User not found: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Check if user is active
    if (foundUser.status !== 'Active') {
      console.log(`❌ User account inactive: ${username} (Status: ${foundUser.status})`);
      return res.status(401).json({
        success: false,
        message: 'Account is inactive. Please contact administrator.'
      });
    }

    // Verify password using bcrypt
    console.log('🔍 Verifying password...');
    const match = await bcrypt.compare(password, foundUser.password);
    if (!match) {
      console.log(`❌ Invalid password for: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    console.log(`✅ Login successful for: ${username} (${foundUser.fullName}) - Role: ${foundUser.role}`);

    // Return success with user data (excluding password)
    const { password: _, ...userData } = foundUser;
    res.json({
      success: true,
      officer: userData,
      message: `Welcome back, ${foundUser.fullName}!`
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again.'
    });
  }
});

// Get officer profile endpoint (for future use)
app.get('/officers/profile/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const accountsBucket = storage.bucket('loansiya-accounts');
    const [file] = await accountsBucket.file('loan_officers.json').download();
    const officers = JSON.parse(file.toString());

    const officer = officers.find((o) => o.username === username);
    if (!officer) {
      return res.status(404).json({
        success: false,
        message: 'Officer not found'
      });
    }

    // Return officer data without password
    const { password, ...officerData } = officer;
    res.json({
      success: true,
      officer: officerData
    });

  } catch (error) {
    console.error('❌ Error fetching officer profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ========================
// USER MANAGEMENT ROUTES
// ========================

// Get all users from all user files
app.get('/users', async (req, res) => {
  try {
    console.log('📥 Fetching all users from GCS...');
    const accountsBucket = storage.bucket('loansiya-accounts');
    
    const userFiles = [
      { file: 'loan_officers.json', roleType: 'LOAN_OFFICER' },
      { file: 'ops_managers.json', roleType: 'OPS_MANAGER' },
      { file: 'it_admins.json', roleType: 'IT_ADMIN' }
    ];

    let allUsers = [];

    for (const userFileInfo of userFiles) {
      try {
        const [file] = await accountsBucket.file(userFileInfo.file).download();
        const users = JSON.parse(file.toString());
        
        // Add file source and normalize role to each user
        const processedUsers = users.map(user => ({
          ...user,
          id: user.username, // Use username as ID for consistency
          roleType: userFileInfo.roleType,
          sourceFile: userFileInfo.file
        }));
        
        allUsers = [...allUsers, ...processedUsers];
      } catch (fileError) {
        console.log(`⚠️  ${userFileInfo.file} not found or error reading: ${fileError.message}`);
        continue;
      }
    }

    console.log(`✅ Found ${allUsers.length} total users`);
    res.json(allUsers);
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      details: error.message
    });
  }
});

// Update user status
app.put('/users/:username/status', async (req, res) => {
  try {
    const { username } = req.params;
    const { status } = req.body;
    
    console.log(`🔄 Updating status for user: ${username} to ${status}`);
    
    if (!['Active', 'Disabled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be Active or Disabled' });
    }

    const accountsBucket = storage.bucket('loansiya-accounts');
    const userFiles = ['loan_officers.json', 'ops_managers.json', 'it_admins.json'];
    
    let userFound = false;
    let updatedUser = null;

    // Find and update user in the appropriate file
    for (const filename of userFiles) {
      try {
        const [file] = await accountsBucket.file(filename).download();
        const users = JSON.parse(file.toString());
        
        const userIndex = users.findIndex(u => u.username === username);
        if (userIndex !== -1) {
          users[userIndex].status = status;
          updatedUser = users[userIndex];
          
          // Save back to GCS
          await accountsBucket.file(filename).save(
            JSON.stringify(users, null, 2),
            { contentType: 'application/json' }
          );
          
          userFound = true;
          console.log(`✅ Updated user ${username} in ${filename}`);
          break;
        }
      } catch (fileError) {
        console.log(`⚠️  Error processing ${filename}: ${fileError.message}`);
        continue;
      }
    }

    if (!userFound) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User status updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ Error updating user status:', error);
    res.status(500).json({
      error: 'Failed to update user status',
      details: error.message
    });
  }
});

// Add new user
app.post('/users', async (req, res) => {
  try {
    const { username, fullName, role, status = 'Active', password } = req.body;
    
    console.log(`➕ Adding new user: ${username} with role: ${role}`);
    
    // Validate required fields
    if (!username || !fullName || !role || !password) {
      return res.status(400).json({
        error: 'Username, fullName, role, and password are required'
      });
    }

    // Determine target file based on role
    let targetFile;
    let displayRole;
    
    switch (role) {
      case 'LOAN_OFFICER':
        targetFile = 'loan_officers.json';
        displayRole = 'Loan Officer';
        break;
      case 'OPS_MANAGER':
        targetFile = 'ops_managers.json';
        displayRole = 'OPS_MANAGER';
        break;
      case 'IT_ADMIN':
        targetFile = 'it_admins.json';
        displayRole = 'IT_ADMIN';
        break;
      default:
        return res.status(400).json({ error: 'Invalid role' });
    }

    const accountsBucket = storage.bucket('loansiya-accounts');
    
    // Check if username already exists in any file
    const allFiles = ['loan_officers.json', 'ops_managers.json', 'it_admins.json'];
    for (const filename of allFiles) {
      try {
        const [file] = await accountsBucket.file(filename).download();
        const users = JSON.parse(file.toString());
        
        if (users.find(u => u.username === username)) {
          return res.status(400).json({ error: 'Username already exists' });
        }
      } catch (fileError) {
        // File doesn't exist, create empty array
        continue;
      }
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user object
    const newUser = {
      username,
      password: hashedPassword,
      fullName,
      role: displayRole,
      status
    };

    // Load existing users from target file or create empty array
    let users = [];
    try {
      const [file] = await accountsBucket.file(targetFile).download();
      users = JSON.parse(file.toString());
    } catch (fileError) {
      console.log(`📝 Creating new ${targetFile}`);
    }

    // Add new user
    users.push(newUser);

    // Save back to GCS
    await accountsBucket.file(targetFile).save(
      JSON.stringify(users, null, 2),
      {
        contentType: 'application/json',
        metadata: {
          updated: new Date().toISOString(),
          note: 'User added via admin interface'
        }
      }
    );

    console.log(`✅ Added user ${username} to ${targetFile}`);

    // Return user without password
    const { password: _, ...userResponse } = newUser;
    res.json({
      message: 'User added successfully',
      user: { ...userResponse, id: username, roleType: role }
    });
  } catch (error) {
    console.error('❌ Error adding user:', error);
    res.status(500).json({
      error: 'Failed to add user',
      details: error.message
    });
  }
});

// Update user
app.put('/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { fullName, role, status, password } = req.body;
    
    console.log(`🔄 Updating user: ${username}`);
    
    const accountsBucket = storage.bucket('loansiya-accounts');
    const userFiles = [
      { file: 'loan_officers.json', roleType: 'LOAN_OFFICER' },
      { file: 'ops_managers.json', roleType: 'OPS_MANAGER' },
      { file: 'it_admins.json', roleType: 'IT_ADMIN' }
    ];
    
    let userFound = false;
    let oldFile = null;
    let updatedUser = null;

    // Find user in existing files
    for (const userFileInfo of userFiles) {
      try {
        const [file] = await accountsBucket.file(userFileInfo.file).download();
        const users = JSON.parse(file.toString());
        
        const userIndex = users.findIndex(u => u.username === username);
        if (userIndex !== -1) {
          oldFile = userFileInfo;
          updatedUser = { ...users[userIndex] };
          
          // Update fields if provided
          if (fullName) updatedUser.fullName = fullName;
          if (status) updatedUser.status = status;
          if (password) updatedUser.password = await bcrypt.hash(password, 10);
          
          // Handle role change
          if (role && role !== userFileInfo.roleType) {
            // Remove from old file
            users.splice(userIndex, 1);
            await accountsBucket.file(userFileInfo.file).save(
              JSON.stringify(users, null, 2),
              { contentType: 'application/json' }
            );
            
            // Add to new file
            const newFileInfo = userFiles.find(f => f.roleType === role);
            if (!newFileInfo) {
              return res.status(400).json({ error: 'Invalid role' });
            }
            
            // Update role display name
            switch (role) {
              case 'LOAN_OFFICER':
                updatedUser.role = 'Loan Officer';
                break;
              case 'OPS_MANAGER':
                updatedUser.role = 'OPS_MANAGER';
                break;
              case 'IT_ADMIN':
                updatedUser.role = 'IT_ADMIN';
                break;
            }
            
            let newFileUsers = [];
            try {
              const [newFile] = await accountsBucket.file(newFileInfo.file).download();
              newFileUsers = JSON.parse(newFile.toString());
            } catch (err) {
              // New file doesn't exist, create empty array
            }
            
            newFileUsers.push(updatedUser);
            await accountsBucket.file(newFileInfo.file).save(
              JSON.stringify(newFileUsers, null, 2),
              { contentType: 'application/json' }
            );
            
          } else {
            // Update in same file
            users[userIndex] = updatedUser;
            await accountsBucket.file(userFileInfo.file).save(
              JSON.stringify(users, null, 2),
              { contentType: 'application/json' }
            );
          }
          
          userFound = true;
          break;
        }
      } catch (fileError) {
        console.log(`⚠️  Error processing ${userFileInfo.file}: ${fileError.message}`);
        continue;
      }
    }

    if (!userFound) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`✅ Updated user ${username}`);

    // Return user without password
    const { password: _, ...userResponse } = updatedUser;
    res.json({
      message: 'User updated successfully',
      user: { ...userResponse, id: username }
    });
  } catch (error) {
    console.error('❌ Error updating user:', error);
    res.status(500).json({
      error: 'Failed to update user',
      details: error.message
    });
  }
});

// ========================
// FILE LOCKING MECHANISM
// ========================

// Simple in-memory file lock to prevent race conditions
const fileLocks = new Map();

async function acquireFileLock(filepath, timeout = 5000) {
  const startTime = Date.now();
  
  while (fileLocks.has(filepath)) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Timeout acquiring lock for ${filepath}`);
    }
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
  }
  
  fileLocks.set(filepath, Date.now());
  console.log(`🔒 Acquired lock for ${filepath}`);
}

function releaseFileLock(filepath) {
  fileLocks.delete(filepath);
  console.log(`🔓 Released lock for ${filepath}`);
}

// ========================
// NOTIFICATION HELPER FUNCTIONS
// ========================

// Helper function to create ops manager notification
async function createOpsManagerNotification(client, applicationDate) {
  try {
    const notificationFile = bucket.file('notifications/notifications-OM.json');
    
    // Create file if it doesn't exist
    const [notifExists] = await notificationFile.exists();
    if (!notifExists) {
      await notificationFile.save(JSON.stringify([]), {
        contentType: 'application/json',
      });
    }

    // Get existing notifications
    const [notifContents] = await notificationFile.download();
    const notifications = JSON.parse(notifContents.toString());
    
    // PERFECT: Check if notification already exists for this specific application
    // One notification per client per application date (regardless of read status)
    const existingNotification = notifications.find(n =>
      n.cid === client.cid &&
      n.type === 'new_application' &&
      n.applicationDate === applicationDate // Check for specific application date
    );
    
    if (existingNotification) {
      console.log(`📢 Notification already exists for client ${client.cid} application on ${applicationDate}, skipping duplicate`);
      return;
    }

    // Create notification data with application date
    const notificationData = {
      cid: client.cid,
      clientName: client.name,
      type: 'new_application',
      message: `New loan application submitted by ${client.name} (CID: ${client.cid})`,
      recipientRole: 'ops_manager',
      applicationDate: applicationDate // Store the application date for future duplicate checking
    };

    // Add new notification
    const notification = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notificationData
    };
    
    notifications.unshift(notification);
    
    // Save updated notifications
    await notificationFile.save(JSON.stringify(notifications, null, 2), {
      contentType: 'application/json',
    });
    
    console.log(`📢 Created ops manager notification for new application from ${client.name} on ${applicationDate}`);
  } catch (notifError) {
    console.error(`Error creating notification for client ${client.cid}:`, notifError);
    // Don't fail the whole process if notification creation fails
  }
}

// Helper function to create reapplication notification (prevents duplicates)
async function createReapplicationNotification(client, applicationDate) {
  try {
    const notificationFile = bucket.file('notifications/notifications-OM.json');
    
    // Create file if it doesn't exist
    const [notifExists] = await notificationFile.exists();
    if (!notifExists) {
      await notificationFile.save(JSON.stringify([]), {
        contentType: 'application/json',
      });
    }

    // Get existing notifications
    const [notifContents] = await notificationFile.download();
    const notifications = JSON.parse(notifContents.toString());
    
    // 🔧 FIXED: Always create NEW reapplication notifications instead of updating existing ones
    // This ensures ops managers see each reapplication attempt as a separate notification
    
    // Check if this is a truly duplicate notification (within last 5 minutes to prevent spam)
    const recentDuplicates = notifications.filter(n =>
      n.cid === client.cid &&
      n.type === 'new_application' &&
      n.applicationDate === applicationDate &&
      n.isReapplication === true &&
      (Date.now() - new Date(n.timestamp).getTime()) < (5 * 60 * 1000) // Within last 5 minutes
    );
    
    if (recentDuplicates.length > 0) {
      console.log(`🚫 Preventing duplicate reapplication notification for client ${client.cid} on ${applicationDate} (within 5 minutes)`);
      return; // Don't create duplicate within 5 minutes
    }
    
    // Create new reapplication notification (always create new, don't update existing)
    const notificationData = {
      cid: client.cid,
      clientName: client.name,
      type: 'new_application',
      message: `Reapplication: ${client.name} (CID: ${client.cid}) submitted new documents after being declined`,
      recipientRole: 'ops_manager',
      applicationDate: applicationDate,
      isReapplication: true
    };

    const notification = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notificationData
    };
    
    notifications.unshift(notification);
    
    // Save updated notifications
    await notificationFile.save(JSON.stringify(notifications, null, 2), {
      contentType: 'application/json',
    });
    
    console.log(`📢 Created NEW reapplication notification for ${client.name} on ${applicationDate} (ID: ${notification.id})`);
  } catch (notifError) {
    console.error(`Error creating reapplication notification for client ${client.cid}:`, notifError);
    // Don't fail the whole process if notification creation fails
  }
}

// Helper function to ensure notification exists for pending applications
async function ensureNotificationExists(client, applicationDate) {
  try {
    const notificationFile = bucket.file('notifications/notifications-OM.json');
    
    const [notifExists] = await notificationFile.exists();
    if (!notifExists) {
      // No notification file exists, create notification
      await createOpsManagerNotification(client, applicationDate);
      return;
    }

    const [notifContents] = await notificationFile.download();
    const notifications = JSON.parse(notifContents.toString());
    
    // PERFECT: Check if notification exists for this specific application
    const existingNotification = notifications.find(n =>
      n.cid === client.cid &&
      n.type === 'new_application' &&
      n.applicationDate === applicationDate // Check for specific application date
    );
    
    if (!existingNotification) {
      console.log(`⚠️ Missing notification for application ${client.cid} on ${applicationDate}, creating now...`);
      await createOpsManagerNotification(client, applicationDate);
    } else {
      console.log(`✅ Notification exists for application ${client.cid} on ${applicationDate}`);
    }
  } catch (error) {
    console.error(`Error checking notification for client ${client.cid}:`, error);
  }
}

// Helper function to create loan officer decision notification
async function createLoanOfficerDecisionNotification(cid, decision, approvedAmount, clientName, opsManagerUsername = 'Operations Manager') {
  try {
    const notificationFile = bucket.file('notifications/notifications-LO.json');
    
    // Create file if it doesn't exist
    const [notifExists] = await notificationFile.exists();
    if (!notifExists) {
      await notificationFile.save(JSON.stringify([]), {
        contentType: 'application/json',
      });
    }

    // Get existing notifications
    const [notifContents] = await notificationFile.download();
    const notifications = JSON.parse(notifContents.toString());
    
    // Create notification based on decision type
    let notificationData;
    
    if (decision === 'approved') {
      notificationData = {
        cid: cid,
        clientName: clientName,
        type: 'status_change',
        status: 'Approved',
        amount: parseInt(approvedAmount),
        message: `Loan request for client ${clientName} has been approved by ${opsManagerUsername}`,
        recipientRole: 'loan_officer'
      };
    } else {
      notificationData = {
        cid: cid,
        clientName: clientName,
        type: 'status_change',
        status: 'Declined',
        message: `Loan request for client ${clientName} has been declined by ${opsManagerUsername}`,
        recipientRole: 'loan_officer'
      };
    }

    // Add new notification
    const notification = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notificationData
    };
    
    notifications.unshift(notification);
    
    // Save updated notifications
    await notificationFile.save(JSON.stringify(notifications, null, 2), {
      contentType: 'application/json',
    });
    
    console.log(`📢 Created loan officer notification for ${decision} decision on ${clientName} (${cid})`);
  } catch (notifError) {
    console.error(`Error creating loan officer notification for client ${cid}:`, notifError);
    // Don't fail the whole process if notification creation fails
  }
}

// Helper function to create loan officer amount change notification
async function createLoanOfficerAmountNotification(cid, newAmount, clientName, opsManagerUsername = 'Operations Manager') {
  try {
    const notificationFile = bucket.file('notifications/notifications-LO.json');
    
    // Create file if it doesn't exist
    const [notifExists] = await notificationFile.exists();
    if (!notifExists) {
      await notificationFile.save(JSON.stringify([]), {
        contentType: 'application/json',
      });
    }

    // Get existing notifications
    const [notifContents] = await notificationFile.download();
    const notifications = JSON.parse(notifContents.toString());
    
    // Create amount change notification
    const notificationData = {
      cid: cid,
      clientName: clientName,
      type: 'amount_change',
      amount: parseInt(newAmount),
      message: `Loan amount for client ${clientName} has been updated to ₱${parseInt(newAmount).toLocaleString()} by ${opsManagerUsername}`,
      recipientRole: 'loan_officer'
    };

    // Add new notification
    const notification = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notificationData
    };
    
    notifications.unshift(notification);
    
    // Save updated notifications
    await notificationFile.save(JSON.stringify(notifications, null, 2), {
      contentType: 'application/json',
    });
    
    console.log(`📢 Created loan officer amount change notification for ${clientName} (${cid}) - ₱${parseInt(newAmount).toLocaleString()}`);
  } catch (notifError) {
    console.error(`Error creating loan officer amount notification for client ${cid}:`, notifError);
    // Don't fail the whole process if notification creation fails
  }
}

// ========================
// CLIENT DATA ROUTES
// ========================

// Get all clients
app.get('/clients', async (req, res) => {
  try {
    console.log('Fetching clients from GCS...');
    const file = bucket.file('clients/clients.json');
    const [contents] = await file.download();
    const clients = JSON.parse(contents.toString());
    
    // Update each client with their latest loan application data and pending status
    const updatedClients = await Promise.all(clients.map(async (client) => {
      try {
        let hasPendingApplication = false;
        let latestApplicationDate = null;
        
        // BUSINESS RULE: If client has outstanding balance, they can't apply for new loans
        if (client.loanBalance && client.loanBalance.amount > 0) {
          console.log(`❌ Client ${client.cid} has outstanding balance: ₱${client.loanBalance.amount} - cannot apply for new loan`);
          return {
            ...client,
            hasPendingApplication: false,
            latestApplicationDate: null
          };
        }
        
        // Check if client has a loan application that needs to be added to metrics
        const [files] = await bucket.getFiles({
          prefix: `clients/${client.cid}/`
        });

        if (files.length > 0) {
          // Get the latest date folder for THIS client
          const datefolders = files
            .map(file => {
              const parts = file.name.split('/');
              return parts.length >= 4 ? parts[2] : null;
            })
            .filter(Boolean)
            .filter((value, index, self) => self.indexOf(value) === index)
            .sort()
            .reverse();

          if (datefolders.length > 0) {
            const latestDate = datefolders[0];
            const applicationFile = bucket.file(`clients/${client.cid}/${latestDate}/loan-application.json`);
            const [applicationExists] = await applicationFile.exists();

            if (applicationExists) {
              try {
                // Load client metrics to check if this application is already in loan history
                const metricsFile = bucket.file(`client-metrics/${client.cid}-raw.json`);
                const [metricsExists] = await metricsFile.exists();
                
                let metricsData = { loanHistory: [] };
                if (metricsExists) {
                  const [metricsContent] = await metricsFile.download();
                  metricsData = JSON.parse(metricsContent.toString());
                }
                
                // Check if this application date already exists in loan history
                // Look for ANY entry with this date, regardless of status
                const existingApplications = metricsData.loanHistory.filter(loan =>
                  loan.dateApplied === latestDate
                );
                
                if (existingApplications.length === 0) {
                  // This is a NEW application - add it to metrics as "pending"
                  console.log(`✅ Adding new pending application for client ${client.cid} on ${latestDate}`);
                  
                  const newHistoryEntry = {
                    dateApplied: latestDate,
                    status: "pending"
                  };
                  
                  metricsData.loanHistory.push(newHistoryEntry);
                  
                  // Save updated metrics back to GCS with file locking
                  const metricsFilePath = `client-metrics/${client.cid}-raw.json`;
                  try {
                    await acquireFileLock(metricsFilePath);
                    await metricsFile.save(JSON.stringify(metricsData, null, 2), {
                      contentType: 'application/json'
                    });
                  } finally {
                    releaseFileLock(metricsFilePath);
                  }
                  
                  // IMPORTANT: Reset client status to pending when new application is submitted
                  // This ensures client shows as "pending" instead of staying "declined"
                  try {
                    const clientsFile = bucket.file('clients/clients.json');
                    const [clientsContent] = await clientsFile.download();
                    const clients = JSON.parse(clientsContent.toString());
                    
                    const updatedClients = clients.map(c => {
                      if (c.cid === client.cid) {
                        console.log(`🔄 Resetting client ${client.cid} status from "${c.status}" to "pending"`);
                        // Remove the old status and decidedAt when new application is submitted
                        const { status, decidedAt, ...clientWithoutStatus } = c;
                        return clientWithoutStatus; // This makes the client show as "pending"
                      }
                      return c;
                    });
                    
                    await clientsFile.save(JSON.stringify(updatedClients, null, 2), {
                      contentType: 'application/json',
                    });
                    
                    console.log(`✅ Client ${client.cid} status reset to pending`);
                  } catch (statusError) {
                    console.error(`Error resetting client ${client.cid} status:`, statusError);
                    // Don't fail the whole process if status reset fails
                  }
                  
                  hasPendingApplication = true;
                  latestApplicationDate = latestDate;
                  
                  // 🔧 ENHANCED: Check if this should be a reapplication notification
                  // This happens when client was declined recently and submits to a NEW date folder
                  let isReapplicationInNewFolder = false;
                  
                  try {
                    // Check if client has any recent declines (within last 7 days)
                    const recentDeclines = metricsData.loanHistory.filter(loan =>
                      loan.status === "Declined" &&
                      loan.declinedAt &&
                      (Date.now() - new Date(loan.declinedAt).getTime()) < (7 * 24 * 60 * 60 * 1000)
                    );
                    
                    // If client was recently declined, this is a reapplication in new folder
                    if (recentDeclines.length > 0) {
                      console.log(`🔄 NEW FOLDER REAPPLICATION: Client ${client.cid} was recently declined and submitted to new folder ${latestDate}`);
                      isReapplicationInNewFolder = true;
                    }
                  } catch (reapplicationCheckError) {
                    console.error(`Error checking for new folder reapplication:`, reapplicationCheckError);
                  }
                  
                  // Create appropriate notification
                  if (isReapplicationInNewFolder) {
                    await createReapplicationNotification(client, latestDate);
                  } else {
                    await createOpsManagerNotification(client, latestDate);
                  }
                  
                } else {
                  // 🔧 COMPREHENSIVE FIX: Only check the latest date for pending applications
                  // Ignore old pending entries from previous dates
                  const currentDatePendingApps = existingApplications.filter(app =>
                    app.status === "pending" && app.dateApplied === latestDate
                  );
                  
                  // Also check for any other pending apps from this specific date in the full history
                  const allPendingForThisDate = metricsData.loanHistory.filter(loan =>
                    loan.dateApplied === latestDate && loan.status === "pending"
                  );
                  
                  if (currentDatePendingApps.length > 0 || allPendingForThisDate.length > 0) {
                    console.log(`📋 Client ${client.cid} has pending application(s) for ${latestDate}`);
                    console.log(`   - Current date pending: ${currentDatePendingApps.length}`);
                    console.log(`   - All pending for this date: ${allPendingForThisDate.length}`);
                    hasPendingApplication = true;
                    latestApplicationDate = latestDate;
                    
                    // IMPORTANT: Check if notification exists for this pending application
                    // This fixes the issue where metrics exist but notification is missing
                    await ensureNotificationExists(client, latestDate);
                    
                  } else {
                    // No pending applications found - check if this is a reapplication scenario
                    const declinedApplications = existingApplications.filter(app => app.status === "Declined");
                    const approvedApplications = existingApplications.filter(app => app.status === "Approved");
                    
                    // 🛑 CRITICAL FIX: Check for recent declines to prevent race condition
                    const recentDeclines = metricsData.loanHistory.filter(loan =>
                      loan.dateApplied === latestDate &&
                      loan.status === "Declined" &&
                      loan.declinedAt &&
                      (Date.now() - new Date(loan.declinedAt).getTime()) < 30000 // Within last 30 seconds
                    );
                    
                    // 🛑 REFINED FIX: Check if there's already a PENDING reapplication (not processed ones)
                    const pendingReapplicationExists = existingApplications.some(app =>
                      app.isReapplication === true && app.status === "pending"
                    );
                    
                    // 🔄 REAPPLICATION LOGIC: Only allow reapplication if:
                    // 1. Client is declined
                    // 2. There are declined applications for this date
                    // 3. No pending reapplication already exists (prevents infinite loop)
                    // 4. No recent declines (prevents race condition with decline process)
                    // 🔄 REAPPLICATION LOGIC: Only allow reapplication if:
                    // 1. Client is declined
                    // 2. There are declined applications for this date
                    // 3. No pending reapplication already exists (prevents infinite loop)
                    // 4. No recent declines (prevents race condition with decline process)
                    // 5. NEW: Documents were uploaded AFTER the most recent decline (genuine reapplication)
                    if (declinedApplications.length > 0 && client.status === 'declined' && !pendingReapplicationExists && recentDeclines.length === 0) {
                      
                      // 🆕 ENHANCED OPTION 2 FIX: Check if ANY files were uploaded after the most recent decline
                      // This works regardless of mobile app folder behavior
                      let hasNewDocumentsAfterDecline = false;
                      
                      try {
                        // Get the most recent decline timestamp for this date
                        const mostRecentDecline = metricsData.loanHistory
                          .filter(loan => loan.dateApplied === latestDate && loan.status === "Declined" && loan.declinedAt)
                          .sort((a, b) => new Date(b.declinedAt) - new Date(a.declinedAt))[0];
                        
                        if (mostRecentDecline) {
                          const declineTime = new Date(mostRecentDecline.declinedAt);
                          console.log(`🕐 ENHANCED: Checking for ANY files uploaded after decline at: ${declineTime.toISOString()}`);
                          
                          // 🔧 ENHANCED: Check ALL files in the latest date folder (including JSON files)
                          // This catches reapplications even when mobile app reuses same date folder
                          const allFilesInFolder = files.filter(file => {
                            const parts = file.name.split('/');
                            return parts.length >= 4 && parts[2] === latestDate;
                          });
                          
                          console.log(`📂 Checking ${allFilesInFolder.length} files in folder ${latestDate} for timestamps after ${declineTime.toISOString()}`);
                          
                          for (const file of allFilesInFolder) {
                            const uploadTime = new Date(file.metadata.timeCreated);
                            console.log(`   📄 File: ${file.name.split('/').pop()} - Upload: ${uploadTime.toISOString()} vs Decline: ${declineTime.toISOString()}`);
                            
                            if (uploadTime > declineTime) {
                              console.log(`✅ ENHANCED: Found file uploaded after decline: ${file.name} at ${uploadTime.toISOString()}`);
                              hasNewDocumentsAfterDecline = true;
                              break;
                            }
                          }
                          
                          if (!hasNewDocumentsAfterDecline) {
                            console.log(`❌ ENHANCED: All ${allFilesInFolder.length} files for ${latestDate} were uploaded before decline - not a legitimate reapplication`);
                          } else {
                            console.log(`🎯 ENHANCED: Legitimate reapplication detected - files uploaded after decline!`);
                          }
                        } else {
                          console.log(`⚠️ No decline timestamp found for ${latestDate} - allowing reapplication`);
                          hasNewDocumentsAfterDecline = true; // Default to allow if no decline timestamp
                        }
                      } catch (timestampError) {
                        console.error(`Error checking document timestamps for client ${client.cid}:`, timestampError);
                        hasNewDocumentsAfterDecline = true; // Default to allow on error
                      }
                      
                      // Only create reapplication if there are genuinely new documents
                      if (hasNewDocumentsAfterDecline) {
                        console.log(`🔄 LEGITIMATE REAPPLICATION: Client ${client.cid} submitted NEW documents after decline on ${latestDate}`);
                        
                        // Add new pending entry for reapplication
                        const reapplicationEntry = {
                          dateApplied: latestDate,
                          status: "pending",
                          isReapplication: true
                        };
                        
                        metricsData.loanHistory.push(reapplicationEntry);
                        
                        // Save updated metrics back to GCS with file locking
                        const metricsFilePath = `client-metrics/${client.cid}-raw.json`;
                        try {
                          await acquireFileLock(metricsFilePath);
                          await metricsFile.save(JSON.stringify(metricsData, null, 2), {
                            contentType: 'application/json'
                          });
                        } finally {
                          releaseFileLock(metricsFilePath);
                        }
                        
                        // Reset client status to pending for reapplication
                        try {
                          const clientsFile = bucket.file('clients/clients.json');
                          const [clientsContent] = await clientsFile.download();
                          const clients = JSON.parse(clientsContent.toString());
                          
                          const updatedClients = clients.map(c => {
                            if (c.cid === client.cid) {
                              console.log(`🔄 Resetting declined client ${client.cid} to "pending" for legitimate reapplication`);
                              // Remove the old status and decidedAt for reapplication
                              const { status, decidedAt, ...clientWithoutStatus } = c;
                              return clientWithoutStatus; // This makes the client show as "pending"
                            }
                            return c;
                          });
                          
                          await clientsFile.save(JSON.stringify(updatedClients, null, 2), {
                            contentType: 'application/json',
                          });
                          
                          console.log(`✅ Client ${client.cid} legitimate reapplication status reset to pending`);
                        } catch (statusError) {
                          console.error(`Error resetting reapplication status for client ${client.cid}:`, statusError);
                        }
                        
                        hasPendingApplication = true;
                        latestApplicationDate = latestDate;
                        
                        // Create reapplication notification (with special handling to prevent duplicates)
                        await createReapplicationNotification(client, latestDate);
                        
                      } else {
                        console.log(`🚫 FALSE REAPPLICATION PREVENTED: Client ${client.cid} - no new documents after decline`);
                        hasPendingApplication = false;
                      }
                      
                    } else {
                      // All applications for this date have been fully processed
                      if (pendingReapplicationExists) {
                        console.log(`⏸️ Client ${client.cid} already has pending reapplication on ${latestDate} - will not create duplicate`);
                      } else if (recentDeclines.length > 0) {
                        console.log(`🚨 RACE CONDITION PREVENTED: Client ${client.cid} has recent declines on ${latestDate} - will not create new pending entry`);
                      } else {
                        console.log(`✅ Client ${client.cid} application on ${latestDate} already processed - no pending entries`);
                      }
                      console.log(`   - Declined: ${declinedApplications.length}, Approved: ${approvedApplications.length}, Pending reapplication exists: ${pendingReapplicationExists}, Recent declines: ${recentDeclines.length}`);
                      hasPendingApplication = false;
                    }
                  }
                }
                
              } catch (metricsError) {
                console.error(`Error processing metrics for client ${client.cid}:`, metricsError);
                // If we can't read/update metrics, assume it's not pending to be safe
                hasPendingApplication = false;
              }
              
              // Update loan history in client data with correct amount and date if pending
              if (hasPendingApplication && client.loans?.loanHistory?.length > 0) {
                const [applicationContent] = await applicationFile.download();
                const clientLoanData = JSON.parse(applicationContent.toString());

                // Only update if this application file belongs to the current client
                if (clientLoanData.cid === client.cid) {
                  const updatedLoanHistory = [...client.loans.loanHistory];
                  const latestIndex = updatedLoanHistory.length - 1;
                  
                  // Update the latest loan request with data from THIS client's application file
                  if (latestIndex >= 0) {
                    updatedLoanHistory[latestIndex] = {
                      ...updatedLoanHistory[latestIndex],
                      amount: parseInt(clientLoanData.loanAmount),
                      dateApplied: latestDate
                    };
                  }

                  return {
                    ...client,
                    hasPendingApplication,
                    latestApplicationDate,
                    loans: {
                      ...client.loans,
                      loanHistory: updatedLoanHistory
                    }
                  };
                }
              }
            }
          }
        }

        return {
          ...client,
          hasPendingApplication,
          latestApplicationDate
        };
      } catch (err) {
        console.error(`Error updating client ${client.cid}:`, err);
        return {
          ...client,
          hasPendingApplication: false,
          latestApplicationDate: null
        }; // Return original client with false flag if there's an error
      }
    }));
    
    res.json(updatedClients);
  } catch (err) {
    console.error('❌ Error loading clients from GCS:', err);
    res.status(500).json({ error: 'Failed to load clients', details: err.message });
  }
});

// Get one client by CID
app.get('/client/:cid', async (req, res) => {
  try {
    console.log(`Fetching client ${req.params.cid} from GCS...`);
    const file = bucket.file('clients/clients.json');
    const [contents] = await file.download();
    const clients = JSON.parse(contents.toString());
    const client = clients.find(c => c.cid === req.params.cid);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(client);
  } catch (err) {
    console.error('❌ Error loading client by CID:', err);
    res.status(500).json({ error: 'Failed to load client', details: err.message });
  }
});

// Credit scoring logic
const weights = {
  paymentHistory: 0.35,
  creditUtilization: 0.30,
  creditHistoryLength: 0.15,
  creditMix: 0.10,
  newInquiries: 0.10,
};

const logisticWeights = {
  intercept: -4,
  paymentHistory: 5,
  creditUtilization: -3,
  creditHistoryLength: 2,
  creditMix: 1,
  newInquiries: -2,
};

function calculateCreditScore(data) {
  const normalized = {
    paymentHistory: data.paymentHistory / 100,
    creditUtilization: 1 - (data.creditUtilization / 100),
    creditHistoryLength: Math.min(data.creditHistoryLength / 60, 1),
    creditMix: data.creditMix / 100,
    newInquiries: 1 - (data.newInquiries / 100),
  };

  const weightedSum =
    weights.paymentHistory * normalized.paymentHistory +
    weights.creditUtilization * normalized.creditUtilization +
    weights.creditHistoryLength * normalized.creditHistoryLength +
    weights.creditMix * normalized.creditMix +
    weights.newInquiries * normalized.newInquiries;

  return Math.round(300 + weightedSum * 550);
}

function calculateDefaultProbability(data) {
  const z =
    logisticWeights.intercept +
    logisticWeights.paymentHistory * (data.paymentHistory / 100) +
    logisticWeights.creditUtilization * (data.creditUtilization / 100) +
    logisticWeights.creditHistoryLength * (data.creditHistoryLength / 100) +
    logisticWeights.creditMix * (data.creditMix / 100) +
    logisticWeights.newInquiries * (data.newInquiries / 100);

  return parseFloat((1 / (1 + Math.exp(-z))).toFixed(4));
}

function classifyRisk(score) {
  if (score >= 800) return 'Exceptional';
  if (score >= 740) return 'Very Good';
  if (score >= 670) return 'Good';
  if (score >= 580) return 'Fair';
  return 'Poor';
}

function getRecommendation(category) {
  if (category === 'Poor') return 'REVIEW OR DECLINE';
  if (category === 'Fair') return 'REVIEW';
  return 'APPROVE';
}

// Score endpoint
app.post('/score/:cid', async (req, res) => {
  try {
    console.log(`Scoring client ${req.params.cid}...`);
    const cid = req.params.cid;

    // Load client metrics
    const file = bucket.file(`client-metrics/processed/${cid}.json`);
    const [contents] = await file.download();
    const metrics = JSON.parse(contents.toString());

    const creditScore = calculateCreditScore(metrics);
    const defaultProbability = calculateDefaultProbability(metrics);
    const riskCategory = classifyRisk(creditScore);
    const recommendation = getRecommendation(riskCategory);

    const result = {
      timestamp: new Date().toISOString(),
      cid,
      input: metrics,
      creditScore,
      defaultProbability,
      riskCategory,
      recommendation,
    };

    // Save score result
    const scoreFile = bucket.file(`scores/${cid}.json`);
    await scoreFile.save(JSON.stringify(result, null, 2), {
      contentType: 'application/json',
    });

    res.json(result);
  } catch (err) {
    console.error('❌ Error during scoring:', err);
    res.status(500).json({ error: 'Scoring failed', details: err.message });
  }
});

// Get client loan application data
app.get('/client-loan-data/:cid', async (req, res) => {
  try {
    console.log(`Fetching loan data for client ${req.params.cid}...`);
    const cid = req.params.cid;

    // List all files in the client's directory to find the latest date folder
    const [files] = await bucket.getFiles({
      prefix: `clients/${cid}/`
    });

    if (files.length === 0) {
      return res.status(404).json({ error: 'No loan data found for client' });
    }

    // Get the latest date folder
    const datefolders = files
      .map(file => {
        const parts = file.name.split('/');
        return parts.length >= 4 ? parts[2] : null;
      })
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort()
      .reverse();

    if (datefolders.length === 0) {
      return res.status(404).json({ error: 'No loan data found for client' });
    }

    const latestDate = datefolders[0];

    // Download and parse both JSON files using the latest date folder
    const basePath = `clients/${cid}/${latestDate}`;
    const agreementFile = bucket.file(`${basePath}/loan-agreement.json`);
    const applicationFile = bucket.file(`${basePath}/loan-application.json`);

    console.log('Attempting to read files from:');
    console.log(`- ${agreementFile.name}`);
    console.log(`- ${applicationFile.name}`);

    const [agreementContent, applicationContent] = await Promise.all([
      agreementFile.download().then(([content]) => JSON.parse(content.toString())),
      applicationFile.download().then(([content]) => JSON.parse(content.toString()))
    ]);

    // Combine and format the data
    // Check both approved and declined statuses to get the most recent decision
    let status = null;
    let decidedAt = null;
    
    try {
      const approvedFile = bucket.file(`clients-approved/${cid}.json`);
      const declinedFile = bucket.file(`clients-declined/${cid}.json`);
      
      const [approvedExists] = await approvedFile.exists();
      const [declinedExists] = await declinedFile.exists();
      
      let approvedData = null;
      let declinedData = null;
      
      if (approvedExists) {
        const [content] = await approvedFile.download();
        approvedData = JSON.parse(content.toString());
      }
      
      if (declinedExists) {
        const [content] = await declinedFile.download();
        declinedData = JSON.parse(content.toString());
      }
      
      // Compare timestamps to get most recent decision
      if (approvedData && declinedData) {
        const approvedDate = new Date(approvedData.decidedAt);
        const declinedDate = new Date(declinedData.decidedAt);
        
        if (approvedDate > declinedDate) {
          status = 'approved';
          decidedAt = approvedData.decidedAt;
        } else {
          status = 'declined';
          decidedAt = declinedData.decidedAt;
        }
      } else if (approvedData) {
        status = 'approved';
        decidedAt = approvedData.decidedAt;
      } else if (declinedData) {
        status = 'declined';
        decidedAt = declinedData.decidedAt;
      }
    } catch (err) {
      console.log('Error checking approval/decline status:', err);
    }

    const response = {
      cid,
      approvedAmount: agreementContent.borrowerRequest,
      recommendedAmount: agreementContent.recommendedAmount,
      purpose: applicationContent.purpose,
      description: applicationContent.description,
      term: applicationContent.term,
      repaymentMethod: agreementContent.repaymentMethod,
      interestRate: agreementContent.interestRate,
      amountDue: agreementContent.amountDue,
      creditScore: applicationContent.scoreData.creditScore,
      riskCategory: applicationContent.scoreData.riskCategory,
      recommendation: applicationContent.scoreData.recommendation,
      signedAt: agreementContent.signedAt,
      status,
      decidedAt
    };

    res.json(response);
  } catch (err) {
    console.error('❌ Error fetching loan data:', err);
    res.status(500).json({ error: 'Failed to fetch loan data', details: err.message });
  }
});

// Handle loan approval/rejection
// Helper function to upload PDF to GCS
async function uploadPdfToGCS(bucket, pdfBuffer, filename) {
  const file = bucket.file(filename);
  await file.save(pdfBuffer, {
    contentType: 'application/pdf',
  });
  return file;
}

app.post('/loan/:cid/decision', async (req, res) => {
  try {
    console.log(`Processing loan decision for client ${req.params.cid}...`);
    const { decision, approvedAmount, signature, signerName } = req.body;
    const cid = req.params.cid;

    console.log('Received decision:', decision);
    console.log('Approved amount:', approvedAmount);

    if (!['approved', 'declined'].includes(decision)) {
      console.log('Invalid decision:', decision);
      return res.status(400).json({ error: 'Invalid decision' });
    }

    // Get the latest loan data
    // Find the latest date folder
    const [dateFiles] = await bucket.getFiles({
      prefix: `clients/${cid}/`
    });

    const datefolders = dateFiles
      .map(file => {
        const parts = file.name.split('/');
        return parts.length >= 4 ? parts[2] : null;
      })
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort()
      .reverse();

    if (datefolders.length === 0) {
      console.log('No date folders found for client');
      return res.status(404).json({ error: 'Loan application not found' });
    }

    const latestDate = datefolders[0];
    const basePath = `clients/${cid}/${latestDate}`;
    console.log('Looking for loan application at:', basePath);
    
    const applicationFile = bucket.file(`${basePath}/loan-application.json`);
    const [exists] = await applicationFile.exists();
    
    if (!exists) {
      console.log('Application file not found');
      return res.status(404).json({ error: 'Loan application not found' });
    }

    console.log('Found application file, downloading...');
    const [applicationContent] = await applicationFile.download();
    const loanData = JSON.parse(applicationContent.toString());
    console.log('Loan data loaded:', loanData);

    // Current date formatted for loan history
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { 
      month: 'long', 
      day: '2-digit', 
      year: 'numeric'
    });

    // Calculate due date based on actual loan terms
    const loanTerm = parseInt(loanData.term) || 6; // Default to 6 months if not specified
    const repaymentMethod = loanData.repaymentMethod || 'Monthly';
    
    let dueDate = new Date(now);
    
    if (repaymentMethod.toLowerCase() === 'daily') {
      // For daily payments: start date + (term * 30) days
      const totalDays = loanTerm * 30;
      dueDate.setDate(dueDate.getDate() + totalDays);
    } else if (repaymentMethod.toLowerCase() === 'weekly') {
      // For weekly payments: start date + (term * 4.33) weeks
      const totalWeeks = Math.ceil(loanTerm * 4.33);
      dueDate.setDate(dueDate.getDate() + (totalWeeks * 7));
    } else {
      // For monthly payments: start date + term months
      dueDate.setMonth(dueDate.getMonth() + loanTerm);
    }
    
    const formattedDueDate = dueDate.toLocaleDateString('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric'
    });

    // 1. Update clients.json with new loan history
    const clientsFile = bucket.file('clients/clients.json');
    const [clientsContent] = await clientsFile.download();
    const clients = JSON.parse(clientsContent.toString());
    
    const updatedClients = clients.map(c => {
      if (c.cid === cid) {
        // Ensure approvedAmount is a number, not a string
        const approvedAmountNum = parseInt(approvedAmount) || 0;
        
        // Create new loan history entry - WITH calculated dueDate based on actual loan terms
        const newLoanHistory = {
          amount: approvedAmountNum,  // ✅ FIXED: Always use the amount entered by ops manager, regardless of approve/decline
          dateApplied: formattedDate,
          status: decision === 'approved' ? 'Approved' : 'Declined',
          purpose: loanData.purpose,
          dueDate: decision === 'approved' ? formattedDueDate : null,
          paid: false
        };

        // Update loanBalance - only for approved loans, accumulate with existing balance
        let updatedLoanBalance = { ...c.loanBalance };
        if (decision === 'approved') {
          // Ensure current balance is a number and add properly
          const currentBalance = parseInt(c.loanBalance?.amount) || 0;
          updatedLoanBalance = {
            amount: currentBalance + approvedAmountNum,  // Numeric addition
            dueDate: formattedDueDate // Most recent loan's due date
          };
        }

        // Add to existing loan history
        return {
          ...c,
          status: decision,
          decidedAt: now.toISOString(),
          loans: {
            ...c.loans,
            loanHistory: [...c.loans.loanHistory, newLoanHistory]
          },
          loanBalance: updatedLoanBalance
        };
      }
      return c;
    });

    await clientsFile.save(JSON.stringify(updatedClients, null, 2), {
      contentType: 'application/json',
    });
    console.log('Updated clients.json with new loan history');

    // 2. Update client metrics raw file
    const metricsFile = bucket.file(`client-metrics/${cid}-raw.json`);
    const [metricsContent] = await metricsFile.download();
    const metricsData = JSON.parse(metricsContent.toString());

    // Update existing pending entry in metrics instead of adding new one
    const applicationDateStr = latestDate; // Use the actual application date, not today's date
    
    // 🔧 ULTRA-COMPREHENSIVE FIX: Handle all pending entries with detailed logging
    console.log(`🔍 Searching for pending entries with date: "${applicationDateStr}"`);
    console.log(`📊 Current loan history (${metricsData.loanHistory.length} entries):`);
    metricsData.loanHistory.forEach((loan, index) => {
      console.log(`   [${index}] Date: "${loan.dateApplied}", Status: "${loan.status}", Reapp: ${loan.isReapplication || false}`);
    });
    
    // Find ALL pending entries for this application date
    const allPendingIndices = [];
    metricsData.loanHistory.forEach((loan, index) => {
      if (loan.dateApplied === applicationDateStr && loan.status === "pending") {
        allPendingIndices.push({index, entry: loan});
      }
    });
    
    console.log(`🔄 Found ${allPendingIndices.length} pending entries for date "${applicationDateStr}"`);
    allPendingIndices.forEach((item, i) => {
      console.log(`   Pending [${i}]: Index ${item.index}, Reapp: ${item.entry.isReapplication || false}`);
    });
    
    if (allPendingIndices.length > 0) {
      // Update ALL pending entries to the decision status and preserve the most recent one
      for (let i = 0; i < allPendingIndices.length; i++) {
        const {index, entry} = allPendingIndices[i];
        metricsData.loanHistory[index].status = decision === 'approved' ? 'Approved' : 'Declined';
        // Add timestamp for declined entries to prevent race conditions
        if (decision === 'declined') {
          metricsData.loanHistory[index].declinedAt = now.toISOString();
        }
        console.log(`✅ Updated pending entry at index ${index} to "${decision === 'approved' ? 'Approved' : 'Declined'}"`);
      }
      
      console.log(`🎯 Successfully updated ${allPendingIndices.length} pending entries to ${decision}`);
    } else {
      // Fallback: If no pending entry found, add new entry
      const newMetricsHistory = {
        dateApplied: applicationDateStr,
        status: decision === 'approved' ? 'Approved' : 'Declined'
      };
      // Add timestamp for declined entries to prevent race conditions
      if (decision === 'declined') {
        newMetricsHistory.declinedAt = now.toISOString();
      }
      metricsData.loanHistory.push(newMetricsHistory);
      console.log(`⚠️  No pending entry found for "${applicationDateStr}", added new entry`);
    }

    // Save updated metrics with file locking to prevent race conditions
    const metricsFilePath = `client-metrics/${cid}-raw.json`;
    try {
      await acquireFileLock(metricsFilePath);
      await metricsFile.save(JSON.stringify(metricsData, null, 2), {
        contentType: 'application/json'
      });
      console.log('Updated metrics raw file with decision status');
    } finally {
      releaseFileLock(metricsFilePath);
    }

    // Create the decision object with current timestamp and approved amount
    const decisionData = {
      ...loanData,
      status: decision,
      decidedAt: now.toISOString(),
      approvedAmount: decision === 'approved' ? approvedAmount : undefined
    };

    // Make sure target folders exist
    const targetFolder = decision === 'approved' ? 'clients-approved' : 'clients-declined';
    console.log('Creating decision file in:', targetFolder);
    
    // Create folder if it doesn't exist (folders are implicit in GCS)
    const decisionFile = bucket.file(`${targetFolder}/${cid}.json`);
    
    console.log('Saving decision data...');
    await decisionFile.save(JSON.stringify(decisionData, null, 2), {
      contentType: 'application/json',
    });
    console.log('Decision data saved successfully');

    // Generate and store promissory note if loan is approved
    if (decision === 'approved') {
      try {
        console.log('Generating promissory note...');
        const clientData = clients.find(c => c.cid === cid);
        const pdfBuffer = await generatePromissoryNote(
          clientData,
          {
            approvedAmount: approvedAmount,
            interestRate: loanData.interestRate || 5.0,
            term: loanData.term || 6,
            repaymentMethod: loanData.repaymentMethod || 'Monthly'
          },
          signature, // Include signature if provided
          signerName || 'Operations Manager' // Include signer name
        );

        // Upload PDF to documents folder under the latest date
        const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const pdfPath = signature ?
          `documents/${cid}/${currentDate}/signed-promissory-note.pdf` :
          `documents/${cid}/${currentDate}/promissory-note.pdf`;
        await uploadPdfToGCS(bucket, pdfBuffer, pdfPath);
        console.log('Promissory note uploaded successfully');

        // If signature was provided, also store signature metadata
        if (signature && signerName) {
          console.log('Storing signature metadata...');
          const signatureMetadata = {
            signerName,
            signedAt: now.toISOString(),
            cid,
            approvedAmount
          };
          
          const signatureMetadataFile = bucket.file(`documents/${cid}/${currentDate}/signature-metadata.json`);
          await signatureMetadataFile.save(JSON.stringify(signatureMetadata, null, 2), {
            contentType: 'application/json',
          });
          console.log('Signature metadata stored successfully');
        }

        // Removed logic to prevent adding "documents" section to clients.json
        console.log('Skipping update of documents section in clients.json');
      } catch (err) {
        console.error('Error generating/storing promissory note:', err);
        // Continue with response even if PDF generation fails
      }
    }

    // Create loan officer notification for the decision
    try {
      const clientData = updatedClients.find(c => c.cid === cid);
      await createLoanOfficerDecisionNotification(
        cid,
        decision,
        decision === 'approved' ? approvedAmount : null,
        clientData?.name || 'Unknown Client',
        'Operations Manager'
      );
    } catch (notifError) {
      console.error(`Error creating loan officer notification:`, notifError);
      // Don't fail the whole process if notification creation fails
    }

    res.json({
      message: `Loan ${decision} successfully`,
      status: decision
    });
  } catch (err) {
    console.error(`❌ Error processing loan decision:`, err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({
      error: 'Failed to process loan decision',
      details: err.message,
      stack: err.stack
    });
  }
});

// Update loan amount
app.post('/loan/:cid/amount', async (req, res) => {
  try {
    console.log(`Updating loan amount for client ${req.params.cid}...`);
    const { amount } = req.body;
    const cid = req.params.cid;

    if (!amount || typeof amount !== 'number') {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Get the latest loan data path
    // Find the latest date folder
    const [dateFiles] = await bucket.getFiles({
      prefix: `clients/${cid}/`
    });

    const datefolders = dateFiles
      .map(file => {
        const parts = file.name.split('/');
        return parts.length >= 4 ? parts[2] : null;
      })
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort()
      .reverse();

    if (datefolders.length === 0) {
      return res.status(404).json({ error: 'Loan agreement not found' });
    }

    const latestDate = datefolders[0];
    const basePath = `clients/${cid}/${latestDate}`;
    const agreementFile = bucket.file(`${basePath}/loan-agreement.json`);
    const [exists] = await agreementFile.exists();

    if (!exists) {
      return res.status(404).json({ error: 'Loan agreement not found' });
    }

    // Update loan agreement with new amount
    const [agreementContent] = await agreementFile.download();
    const agreement = JSON.parse(agreementContent.toString());
    
    // Update the amount
    agreement.borrowerRequest = amount;

    // Recalculate amount due with 5% interest
    const interest = amount * 0.05;
    agreement.amountDue = amount + interest;
    
    // Save updated agreement
    await agreementFile.save(JSON.stringify(agreement, null, 2), {
      contentType: 'application/json',
    });

    // Create loan officer notification for amount change
    try {
      // Get client name for the notification
      const clientsFile = bucket.file('clients/clients.json');
      const [clientsContent] = await clientsFile.download();
      const clients = JSON.parse(clientsContent.toString());
      const clientData = clients.find(c => c.cid === cid);
      
      await createLoanOfficerAmountNotification(
        cid,
        amount,
        clientData?.name || 'Unknown Client',
        'Operations Manager'
      );
    } catch (notifError) {
      console.error(`Error creating loan officer amount notification:`, notifError);
      // Don't fail the whole process if notification creation fails
    }

    res.json({
      message: 'Loan amount updated successfully',
      updatedAmount: amount,
      amountDue: agreement.amountDue
    });

  } catch (err) {
    console.error('❌ Error updating loan amount:', err);
    res.status(500).json({ error: 'Failed to update loan amount', details: err.message });
  }
});

// Helper function to generate thumbnails
const sharp = require('sharp');

async function generateThumbnail(buffer) {
  return sharp(buffer)
    .resize(200, 150, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg()
    .toBuffer();
}

// Get all documents for a client from latest folder
app.get('/documents/:cid/all', async (req, res) => {
  try {
    const { cid } = req.params;
    console.log(`Fetching documents for client ${cid}...`);
    
    // List all files in the client's directory
    // Check if bucket is accessible
    const [exists] = await bucket.exists();
    console.log('Bucket exists:', exists);
    if (!exists) {
      throw new Error('GCS bucket not found');
    }

    const prefix = `documents/${cid}/`;
    console.log('Searching with prefix:', prefix);
    
    // Get list of files from GCS
    const [files] = await bucket.getFiles({
      prefix: prefix
    });
    
    // Log raw file list from GCS
    console.log('Raw GCS files:', files.map(f => ({
      name: f.name,
      size: f.metadata.size,
      created: f.metadata.timeCreated
    })));

    console.log('Number of files found:', files.length);

    console.log('Files found:', files.map(f => f.name));

    if (files.length === 0) {
      console.log('No files found in directory');
      return res.json({ documents: [], latestDate: null });
    }

    // Get the latest date folder
    console.log('Files returned from GCS:', files.map(f => f.name));
    
    const datefolders = files
      .map(file => {
        const parts = file.name.split('/');
        console.log('File parts:', parts);
        // For files with date folders: documents/{cid}/{date}/filename
        // For files without date folders: documents/{cid}/filename
        if (parts.length >= 4) {
          // Check if parts[2] looks like a date (YYYY-MM-DD format)
          const potentialDate = parts[2];
          if (potentialDate && /^\d{4}-\d{2}-\d{2}$/.test(potentialDate)) {
            return potentialDate;
          }
        }
        return null;
      })
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort()
      .reverse();

    if (datefolders.length === 0) {
      console.log('No date folders found');
      return res.json({ documents: [], latestDate: null });
    }

    const latestDate = datefolders[0];
    const documents = [];

    // Get all files from the latest date folder
    // Filter to only files in the latest date directory
    const latestFiles = files.filter(file => {
      const parts = file.name.split('/');
      return parts.length >= 4 && parts[2] === latestDate;
    });
    
    console.log('Latest date folder:', latestDate);
    console.log('Latest files:', latestFiles.map(f => f.name));

    // Map files to document objects with display names - show all files
    for (const file of latestFiles) {
      const filename = file.name.split('/').pop();
      const ext = filename.split('.').pop().toLowerCase();
      
      console.log('Processing file:', filename, 'with extension:', ext);
      
      // Skip non-document files
      if (!['jpg', 'jpeg', 'pdf'].includes(ext)) {
        console.log('Skipping file with unsupported extension');
        continue;
      }

      // Map filename to display name
      let displayName = '';
      if (filename.startsWith('validid')) displayName = 'Valid Id';
      else if (filename.startsWith('orcr')) displayName = 'ORCR';
      else if (filename.startsWith('landtitle')) displayName = 'Land Title';
      else if (filename.startsWith('deed')) displayName = 'Deeds of Assignment';
      else if (filename.startsWith('signed-promissory-note')) displayName = 'Signed Promissory Note';
      else if (filename.startsWith('promissory-note')) displayName = 'Promissory Note';
      else continue;

      // If there are multiple files with the same display name, add extension to distinguish
      const existingWithSameName = documents.filter(doc => doc.displayName === displayName);
      if (existingWithSameName.length > 0) {
        displayName += ` (${ext.toUpperCase()})`;
      }

      documents.push({
        name: filename,
        displayName,
        type: ext === 'pdf' ? 'application/pdf' : 'image/jpeg',
        date: latestDate
      });
    }

    console.log('Returning documents:', { documents, latestDate });
    res.json({ documents, latestDate });
  } catch (err) {
    console.error('❌ Error fetching documents:', err);
    res.status(500).json({ error: 'Failed to fetch documents', details: err.message });
  }
});

// Get all document dates for a client
app.get('/documents/:cid/dates', async (req, res) => {
  try {
    const { cid } = req.params;
    console.log(`Fetching document dates for client ${cid}...`);
    
    // List all files in the client's directory
    const [files] = await bucket.getFiles({
      prefix: `documents/${cid}/`
    });

    if (files.length === 0) {
      return res.json({ dates: [] });
    }

    // Get all date folders with document counts
    const dateInfo = {};
    
    files.forEach(file => {
      const parts = file.name.split('/');
      if (parts.length >= 4) {
        const potentialDate = parts[2];
        if (potentialDate && /^\d{4}-\d{2}-\d{2}$/.test(potentialDate)) {
          if (!dateInfo[potentialDate]) {
            dateInfo[potentialDate] = 0;
          }
          // Count actual document files (not directories)
          const filename = parts[parts.length - 1];
          const ext = filename.split('.').pop().toLowerCase();
          if (['jpg', 'jpeg', 'pdf'].includes(ext)) {
            dateInfo[potentialDate]++;
          }
        }
      }
    });

    // Convert to array and sort by date (newest first)
    const dates = Object.entries(dateInfo)
      .map(([date, count]) => ({ date, documentCount: count }))
      .sort((a, b) => b.date.localeCompare(a.date));

    console.log('Document dates found:', dates);
    res.json({ dates });
  } catch (err) {
    console.error('❌ Error fetching document dates:', err);
    res.status(500).json({ error: 'Failed to fetch document dates', details: err.message });
  }
});

// Get documents from specific date folder
app.get('/documents/:cid/date/:date', async (req, res) => {
  try {
    const { cid, date } = req.params;
    console.log(`Fetching documents for client ${cid} from date ${date}...`);
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD' });
    }

    const prefix = `documents/${cid}/${date}/`;
    console.log('Searching with prefix:', prefix);
    
    // Get list of files from specific date folder
    const [files] = await bucket.getFiles({
      prefix: prefix
    });
    
    console.log('Files found for date:', files.map(f => f.name));

    if (files.length === 0) {
      return res.json({ documents: [], date: date });
    }

    const documents = [];

    // Map files to document objects with display names
    for (const file of files) {
      const filename = file.name.split('/').pop();
      const ext = filename.split('.').pop().toLowerCase();
      
      console.log('Processing file:', filename, 'with extension:', ext);
      
      // Skip non-document files
      if (!['jpg', 'jpeg', 'pdf'].includes(ext)) {
        console.log('Skipping file with unsupported extension');
        continue;
      }

      // Map filename to display name
      let displayName = '';
      if (filename.startsWith('validid')) displayName = 'Valid Id';
      else if (filename.startsWith('orcr')) displayName = 'ORCR';
      else if (filename.startsWith('landtitle')) displayName = 'Land Title';
      else if (filename.startsWith('deed')) displayName = 'Deeds of Assignment';
      else if (filename.startsWith('signed-promissory-note')) displayName = 'Signed Promissory Note';
      else if (filename.startsWith('promissory-note')) displayName = 'Promissory Note';
      else if (filename.startsWith('signed-agreement') || filename === 'signed_agreement.pdf') displayName = 'Signed Agreement';
      else continue;

      // If there are multiple files with the same display name, add extension to distinguish
      const existingWithSameName = documents.filter(doc => doc.displayName === displayName);
      if (existingWithSameName.length > 0) {
        displayName += ` (${ext.toUpperCase()})`;
      }

      documents.push({
        name: filename,
        displayName,
        type: ext === 'pdf' ? 'application/pdf' : 'image/jpeg',
        date: date
      });
    }

    console.log('Returning documents for date:', { documents, date });
    res.json({ documents, date });
  } catch (err) {
    console.error('❌ Error fetching documents by date:', err);
    res.status(500).json({ error: 'Failed to fetch documents', details: err.message });
  }
});

// Get thumbnail for document
app.get('/documents/:cid/thumbnail/:filename', async (req, res) => {
  try {
    const { cid, filename } = req.params;
    const { date } = req.query; // Optional date parameter
    
    let targetDate = date;
    
    // If no date provided, find the latest date folder
    if (!targetDate) {
      const [files] = await bucket.getFiles({
        prefix: `documents/${cid}/`
      });

      const datefolders = files
        .map(file => {
          const parts = file.name.split('/');
          // For files with date folders: documents/{cid}/{date}/filename
          // For files without date folders: documents/{cid}/filename
          if (parts.length >= 4) {
            // Check if parts[2] looks like a date (YYYY-MM-DD format)
            const potentialDate = parts[2];
            if (potentialDate && /^\d{4}-\d{2}-\d{2}$/.test(potentialDate)) {
              return potentialDate;
            }
          }
          return null;
        })
        .filter(Boolean)
        .filter((value, index, self) => self.indexOf(value) === index)
        .sort()
        .reverse();

      if (datefolders.length === 0) {
        return res.status(404).json({ error: 'No documents found' });
      }

      targetDate = datefolders[0];
    }

    const filePath = `documents/${cid}/${targetDate}/${filename}`;
    const file = bucket.file(filePath);
    
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const [content] = await file.download();
    
    // For PDFs, generate a dynamic thumbnail
    if (filename.endsWith('.pdf')) {
      const pdfThumbnail = await sharp({
        create: {
          width: 200,
          height: 150,
          channels: 4,
          background: { r: 224, g: 224, b: 224 }
        }
      })
      .composite([{
        input: Buffer.from(`
          <svg width="200" height="150">
            <rect width="200" height="150" fill="#e0e0e0"/>
            <text x="100" y="75" font-family="Arial" font-size="24"
                  fill="#666" text-anchor="middle" dominant-baseline="middle">
              PDF
            </text>
          </svg>
        `),
        top: 0,
        left: 0
      }])
      .jpeg()
      .toBuffer();

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(pdfThumbnail);
      return;
    }

    // Generate thumbnail for images
    const thumbnail = await generateThumbnail(content);
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(thumbnail);

  } catch (err) {
    console.error('❌ Error generating thumbnail:', err);
    res.status(500).json({ error: 'Failed to generate thumbnail', details: err.message });
  }
});

// Document type mapping and paths
const DOCUMENT_TYPE_MAP = {
  'Valid Id': 'validid',
  'ORCR': 'orcr',
  'Land Title': 'landtitle',
  'Deeds of Assignment': 'deed',
  'Promissory Note': 'promissory-note',
  'Signed Agreement': 'signed-agreement'
};

// Reverse mapping for API endpoints (internal type -> paths)
const INTERNAL_TYPE_MAP = {
  'validid': ['validid.jpg', 'validid.jpeg'],
  'orcr': ['orcr.jpg', 'orcr.jpeg'],
  'landtitle': ['landtitle.jpg'],
  'deed': ['deed.jpg'],
  'promissory-note': ['promissory-note.pdf'],
  'signed-agreement': ['signed_agreement.pdf', 'signed-agreement.pdf']
};


// Get specific document by exact filename
app.get('/documents/:cid/file/:filename', async (req, res) => {
  try {
    const { cid, filename } = req.params;
    const { date } = req.query; // Optional date parameter
    console.log(`Fetching specific file ${filename} for client ${cid}...`);

    let targetDate = date;
    
    // If no date provided, find the latest date folder
    if (!targetDate) {
      const [files] = await bucket.getFiles({
        prefix: `documents/${cid}/`
      });

      if (files.length === 0) {
        return res.status(404).json({ error: 'No documents found for client' });
      }

      // Get the latest date folder
      const datefolders = files
        .map(file => {
          const parts = file.name.split('/');
          if (parts.length >= 4) {
            const potentialDate = parts[2];
            if (potentialDate && /^\d{4}-\d{2}-\d{2}$/.test(potentialDate)) {
              return potentialDate;
            }
          }
          return null;
        })
        .filter(Boolean)
        .filter((value, index, self) => self.indexOf(value) === index)
        .sort()
        .reverse();

      if (datefolders.length === 0) {
        return res.status(404).json({ error: 'No documents found for client' });
      }

      targetDate = datefolders[0];
    }

    const filePath = `documents/${cid}/${targetDate}/${filename}`;
    console.log('Looking for file at path:', filePath);
    
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    
    if (!exists) {
      return res.status(404).json({ error: `File ${filename} not found in date folder ${targetDate}` });
    }

    // Determine content type based on file extension
    const ext = filename.split('.').pop().toLowerCase();
    const contentType = ext === 'pdf' ? 'application/pdf' :
                       ['jpg', 'jpeg'].includes(ext) ? 'image/jpeg' :
                       'application/octet-stream';

    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    // Stream the file to the response
    file.createReadStream()
      .on('error', err => {
        console.error(`Error streaming ${filename}:`, err);
        res.status(500).json({ error: 'Failed to stream document' });
      })
      .pipe(res);

  } catch (err) {
    console.error(`❌ Error fetching file ${req.params.filename}:`, err);
    res.status(500).json({ error: `Failed to fetch file`, details: err.message });
  }
});

// General document retrieval endpoint with preview support
app.get('/documents/:cid/:documentType', async (req, res) => {
  try {
    console.log(`Fetching ${req.params.documentType} for client ${req.params.cid}...`);
    const { cid, documentType } = req.params;

    // Check if documentType is already an internal type or if it's a display name
    let possibleFiles;
    if (INTERNAL_TYPE_MAP[documentType]) {
      // documentType is already an internal type (e.g., 'deed')
      possibleFiles = INTERNAL_TYPE_MAP[documentType];
      console.log('Using internal type:', documentType);
    } else {
      // documentType might be a display name, try to convert it
      const internalType = DOCUMENT_TYPE_MAP[documentType];
      if (internalType && INTERNAL_TYPE_MAP[internalType]) {
        possibleFiles = INTERNAL_TYPE_MAP[internalType];
        console.log('Converted display name to internal type:', documentType, '->', internalType);
      } else {
        console.log('Invalid document type:', documentType);
        return res.status(400).json({ error: 'Invalid document type' });
      }
    }
    
    console.log('Looking for files:', possibleFiles);

    // List all files in the client's directory to find the latest date folder
    const [files] = await bucket.getFiles({
      prefix: `documents/${cid}/`
    });

    if (files.length === 0) {
      return res.status(404).json({ error: 'No documents found for client' });
    }

    // Get the latest date folder
    const datefolders = files
      .map(file => {
        const parts = file.name.split('/');
        // For files with date folders: documents/{cid}/{date}/filename
        // For files without date folders: documents/{cid}/filename
        if (parts.length >= 4) {
          // Check if parts[2] looks like a date (YYYY-MM-DD format)
          const potentialDate = parts[2];
          if (potentialDate && /^\d{4}-\d{2}-\d{2}$/.test(potentialDate)) {
            return potentialDate;
          }
        }
        return null;
      })
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort()
      .reverse();

    if (datefolders.length === 0) {
      return res.status(404).json({ error: 'No documents found for client' });
    }

    const latestDate = datefolders[0];

    // Try each possible filename in the latest date folder
    let file = null;
    for (const filename of possibleFiles) {
      const filePath = `documents/${cid}/${latestDate}/${filename}`;
      console.log('Checking path:', filePath);
      const tempFile = bucket.file(filePath);
      const [exists] = await tempFile.exists();
      if (exists) {
        file = tempFile;
        break;
      }
    }

    if (!file) {
      return res.status(404).json({ error: `${documentType} not found` });
    }

    // Determine content type based on file extension
    const ext = file.name.split('.').pop().toLowerCase();
    const contentType = ext === 'pdf' ? 'application/pdf' :
                       ['jpg', 'jpeg'].includes(ext) ? 'image/jpeg' :
                       'application/octet-stream';

    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${documentType}-${cid}.${ext}"`);

    // Stream the file to the response
    file.createReadStream()
      .on('error', err => {
        console.error(`Error streaming ${documentType}:`, err);
        res.status(500).json({ error: 'Failed to stream document' });
      })
      .pipe(res);

  } catch (err) {
    console.error(`❌ Error fetching ${req.params.documentType}:`, err);
    res.status(500).json({ error: `Failed to fetch ${req.params.documentType}`, details: err.message });
  }
});

// Get promissory note PDF (keeping for backwards compatibility)
app.get('/documents/:cid/promissory-note', async (req, res) => {
  try {
    console.log(`Fetching promissory note for client ${req.params.cid}...`);
    const cid = req.params.cid;

    const pdfPath = `documents/${cid}/${latestDate}/promissory-note.pdf`;
    const file = bucket.file(pdfPath);
    
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'Promissory note not found' });
    }

    // Set response headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="promissory-note-${cid}.pdf"`);

    // Stream the PDF file to the response
    file.createReadStream()
      .on('error', err => {
        console.error('Error streaming PDF:', err);
        res.status(500).json({ error: 'Failed to stream PDF' });
      })
      .pipe(res);

  } catch (err) {
    console.error('❌ Error fetching promissory note:', err);
    res.status(500).json({ error: 'Failed to fetch promissory note', details: err.message });
  }
});

// Generate promissory note with signature endpoint
app.post('/generate-promissory-note', async (req, res) => {
  try {
    console.log('Generating promissory note with signature...');
    const { clientData, loanData, signature, signerName } = req.body;

    if (!clientData || !loanData) {
      return res.status(400).json({ error: 'Missing client data or loan data' });
    }

    // Generate the PDF with signature
    const pdfBuffer = await generatePromissoryNote(
      clientData,
      loanData,
      signature,
      signerName || 'Operations Manager'
    );

    // Set response headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="signed-promissory-note-${clientData.cid}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Send the PDF buffer
    res.send(pdfBuffer);

  } catch (err) {
    console.error('❌ Error generating signed promissory note:', err);
    res.status(500).json({ error: 'Failed to generate promissory note', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Credit Scoring API running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Using GCS bucket: ${process.env.GCS_BUCKET}`);
});