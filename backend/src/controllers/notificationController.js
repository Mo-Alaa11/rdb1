const prisma = require('../config/database');

/**
 * Get all notifications for the authenticated user
 * GET /api/notifications
 */
exports.getNotifications = async (req, res) => {
  try {
    const { unread } = req.query;

    const filters = { userId: req.user.id };
    
    if (unread === 'true') {
      filters.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to last 50 notifications
    });

    res.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true }
    });

    res.json({ message: 'Notification marked as read', notification: updated });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
};

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
exports.markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { 
        userId: req.user.id,
        read: false
      },
      data: { read: true }
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
};

/**
 * Delete a notification
 * DELETE /api/notifications/:id
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.notification.delete({
      where: { id }
    });

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};
