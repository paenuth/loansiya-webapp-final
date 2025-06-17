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
    const file = bucket.file('notifications/notifications.json');
    
    // Create file if it doesn't exist
    const [exists] = await file.exists();
    if (!exists) {
      await file.save(JSON.stringify([]), {
        contentType: 'application/json',
      });
    }

    const [contents] = await file.download();
    const allNotifications = JSON.parse(contents.toString());

    // Filter notifications by role and sort by timestamp
    const notifications = allNotifications
      .filter(n => n.recipientRole === recipientRole)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(notifications);
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

    const file = bucket.file('notifications/notifications.json');
    
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

    // Add new notification
    notifications.unshift(notification);

    // Save updated notifications
    await file.save(JSON.stringify(notifications, null, 2), {
      contentType: 'application/json',
    });

    res.json(notification);
  } catch (err) {
    console.error('❌ Error creating notification:', err);
    res.status(500).json({ error: 'Failed to create notification', details: err.message });
  }
});

// Mark notifications as read
router.post('/notifications/mark-read', async (req, res) => {
  try {
    const { notificationIds } = req.body;
    const file = bucket.file('notifications/notifications.json');
    
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