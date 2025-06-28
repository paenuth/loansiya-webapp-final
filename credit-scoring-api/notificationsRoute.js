require('dotenv').config();
const express = require('express');
const router = express.Router();
const { Storage } = require('@google-cloud/storage');

// Use environment variables for configuration
const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});
const bucket = storage.bucket(process.env.GCS_BUCKET);

// Get notifications
router.get('/notifications', async (req, res) => {
  try {
    const recipientRole = req.query.role || 'loan_officer'; // Default to loan_officer
    
    // Determine which file to use based on role
    let notificationFile;
    if (recipientRole === 'ops_manager') {
      notificationFile = 'notifications/notifications-OM.json';
    } else {
      notificationFile = 'notifications/notifications-LO.json';
    }
    
    const file = bucket.file(notificationFile);
    
    // Create file if it doesn't exist
    const [exists] = await file.exists();
    if (!exists) {
      await file.save(JSON.stringify([]), {
        contentType: 'application/json',
      });
    }

    const [contents] = await file.download();
    const notifications = JSON.parse(contents.toString());

    // Sort by timestamp (newest first)
    const sortedNotifications = notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(sortedNotifications);
  } catch (err) {
    console.error('❌ Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications', details: err.message });
  }
});

// Create notification
router.post('/notifications', async (req, res) => {
  try {
    const notification = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
      ...req.body
    };

    // Determine which file to use based on recipient role
    let notificationFile;
    if (notification.recipientRole === 'ops_manager') {
      notificationFile = 'notifications/notifications-OM.json';
    } else {
      notificationFile = 'notifications/notifications-LO.json';
    }

    const file = bucket.file(notificationFile);
    
    // Create file if it doesn't exist
    const [exists] = await file.exists();
    if (!exists) {
      await file.save(JSON.stringify([]), {
        contentType: 'application/json',
      });
    }

    // Get existing notifications
    const [contents] = await file.download();
    const notifications = JSON.parse(contents.toString());

    // 🚫 DEDUPLICATION LOGIC: Prevent duplicate notifications
    const isDuplicate = notifications.some(existing => {
      return existing.cid === notification.cid &&
             existing.type === notification.type &&
             existing.recipientRole === notification.recipientRole &&
             !existing.read; // Only check unread notifications
    });

    if (isDuplicate) {
      console.log(`⚠️ Duplicate notification prevented for CID: ${notification.cid}, Type: ${notification.type}`);
      return res.status(409).json({
        error: 'Duplicate notification',
        message: `A similar unread notification already exists for CID ${notification.cid}`
      });
    }

    // Add new notification
    notifications.unshift(notification);

    // Save updated notifications
    await file.save(JSON.stringify(notifications, null, 2), {
      contentType: 'application/json',
    });

    console.log(`✅ Created notification for CID: ${notification.cid}, Type: ${notification.type}`);
    res.json(notification);
  } catch (err) {
    console.error('❌ Error creating notification:', err);
    res.status(500).json({ error: 'Failed to create notification', details: err.message });
  }
});

// Mark notifications as read
router.post('/notifications/mark-read', async (req, res) => {
  try {
    const { notificationIds, role } = req.body;
    
    // Determine which file to use based on role
    let notificationFile;
    if (role === 'ops_manager') {
      notificationFile = 'notifications/notifications-OM.json';
    } else {
      notificationFile = 'notifications/notifications-LO.json';
    }
    
    const file = bucket.file(notificationFile);
    
    const [contents] = await file.download();
    const notifications = JSON.parse(contents.toString());

    // Update read status
    const updatedNotifications = notifications.map(notification => {
      if (notificationIds.includes(notification.id)) {
        return { ...notification, read: true };
      }
      return notification;
    });

    // Save updated notifications
    await file.save(JSON.stringify(updatedNotifications, null, 2), {
      contentType: 'application/json',
    });

    res.json({ message: 'Notifications marked as read' });
  } catch (err) {
    console.error('❌ Error marking notifications as read:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read', details: err.message });
  }
});

module.exports = router;