const notificationService = require('../services/notificationService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

/**
 * @desc   Get all notifications for the authenticated user
 * @route  GET /api/notifications
 * @access Private
 */
const getNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.getUserNotifications(req.user._id);
    return sendSuccess(
      res,
      'Notifications retrieved successfully',
      {
        notifications: result.notifications,
        unreadCount: result.unreadCount,
        total: result.total
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Mark a single notification as read
 * @route  PATCH /api/notifications/:id/read
 * @access Private
 */
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return sendError(res, 'Notification ID is required', null, 400);
    }

    const notification = await notificationService.markAsRead(id, req.user._id);
    if (!notification) {
      return sendError(res, 'Notification not found or unauthorized', null, 404);
    }

    const { unreadCount } = await notificationService.getUserNotifications(req.user._id);

    return sendSuccess(
      res,
      'Notification marked as read',
      {
        notification,
        unreadCount
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Mark all notifications for authenticated user as read
 * @route  PATCH /api/notifications/read-all
 * @access Private
 */
const markAllAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user._id);
    return sendSuccess(
      res,
      'All notifications marked as read',
      {
        unreadCount: 0
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
