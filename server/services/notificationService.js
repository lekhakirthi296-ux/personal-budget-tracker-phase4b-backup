const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { isMongoConnected } = require('../config/db');
const memoryStore = require('../config/inMemoryStore');

/**
 * Creates a notification for a user
 * @param {Object} param0
 * @param {string|ObjectId} param0.userId
 * @param {string} param0.title
 * @param {string} param0.message
 * @param {string} [param0.type='info']
 * @param {Object} [param0.metadata={}]
 * @param {Date} [param0.createdAt]
 * @param {boolean} [param0.isRead=false]
 */
const createNotification = async ({
  userId,
  title,
  message,
  type = 'info',
  metadata = {},
  createdAt = new Date(),
  isRead = false
}) => {
  if (!userId || !title || !message) {
    return null;
  }

  const notificationData = {
    userId,
    title: title.trim(),
    message: message.trim(),
    type,
    metadata,
    createdAt: new Date(createdAt),
    isRead: Boolean(isRead)
  };

  if (isMongoConnected()) {
    try {
      return await Notification.create(notificationData);
    } catch (err) {
      return await memoryStore.createNotification(notificationData);
    }
  } else {
    return await memoryStore.createNotification(notificationData);
  }
};

/**
 * Get all notifications for an authenticated user
 * @param {string|ObjectId} userId
 */
const getUserNotifications = async (userId) => {
  if (!userId) return { notifications: [], unreadCount: 0, total: 0 };

  let list = [];

  if (isMongoConnected()) {
    try {
      list = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .lean();
    } catch (e) {
      list = await memoryStore.findNotifications(userId);
    }
  } else {
    list = await memoryStore.findNotifications(userId);
  }

  const unreadCount = list.filter((n) => !n.isRead).length;

  return {
    notifications: list,
    unreadCount,
    total: list.length
  };
};

/**
 * Mark a single notification as read
 * @param {string} notificationId
 * @param {string|ObjectId} userId
 */
const markAsRead = async (notificationId, userId) => {
  if (!notificationId || !userId) return null;

  let notification = null;

  if (isMongoConnected()) {
    try {
      notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true, readAt: new Date() },
        { new: true }
      ).lean();
    } catch (e) {
      // Query error or memory fallback
    }
  }

  if (!notification) {
    notification = await memoryStore.markNotificationAsRead(notificationId, userId);
  }

  if (!notification && !isMongoConnected()) {
    try {
      notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true, readAt: new Date() },
        { new: true }
      ).lean();
    } catch (e) {
      // Offline fallback
    }
  }

  return notification;
};

/**
 * Mark all notifications for a user as read
 * @param {string|ObjectId} userId
 */
const markAllAsRead = async (userId) => {
  if (!userId) return 0;

  let count = 0;

  if (isMongoConnected()) {
    try {
      const res = await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );
      count += res.modifiedCount || 0;
    } catch (e) {
      // ignore
    }
  }

  const memCount = await memoryStore.markAllNotificationsAsRead(userId);
  return count || memCount;
};

/**
 * Helper to check budget threshold and trigger notifications
 * @param {string|ObjectId} userId
 * @param {string} category
 * @param {number} month
 * @param {number} year
 * @param {number} budgetAmount
 * @param {number} currentSpent
 */
const checkBudgetThresholdNotification = async (userId, category, month, year, budgetAmount, currentSpent) => {
  if (!userId || !budgetAmount || budgetAmount <= 0) return null;

  const percentage = (currentSpent / budgetAmount) * 100;

  if (percentage > 100) {
    return await createNotification({
      userId,
      title: 'Budget Limit Exceeded ⚠️',
      message: `You've spent ₹${currentSpent.toLocaleString('en-IN')} of your ₹${budgetAmount.toLocaleString('en-IN')} budget for ${category} (${percentage.toFixed(0)}%).`,
      type: 'budget_exceeded',
      metadata: { category, month, year, percentage, budgetAmount, currentSpent }
    });
  } else if (percentage === 100) {
    return await createNotification({
      userId,
      title: 'Budget Limit Reached (100%)',
      message: `You have reached 100% of your ₹${budgetAmount.toLocaleString('en-IN')} ${category} budget.`,
      type: 'budget_limit',
      metadata: { category, month, year, percentage, budgetAmount, currentSpent }
    });
  } else if (percentage >= 80) {
    return await createNotification({
      userId,
      title: 'Budget Warning (80% Reached)',
      message: `You have used ${percentage.toFixed(0)}% of your ₹${budgetAmount.toLocaleString('en-IN')} budget for ${category}.`,
      type: 'budget_warning',
      metadata: { category, month, year, percentage, budgetAmount, currentSpent }
    });
  }

  return null;
};

/**
 * Helper for savings contribution notification
 */
const notifySavingsContribution = async (userId, goalName, amount, newBalance, targetAmount) => {
  const isCompleted = newBalance >= targetAmount;

  await createNotification({
    userId,
    title: 'Contribution Added 💰',
    message: `₹${Number(amount).toLocaleString('en-IN')} deposited into "${goalName}". New balance: ₹${Number(newBalance).toLocaleString('en-IN')}.`,
    type: 'savings_contribution',
    metadata: { goalName, amount, newBalance, targetAmount }
  });

  if (isCompleted) {
    await createNotification({
      userId,
      title: 'Savings Goal Achieved! 🎉',
      message: `Congratulations! You reached 100% of your ₹${Number(targetAmount).toLocaleString('en-IN')} goal for "${goalName}".`,
      type: 'savings_completed',
      metadata: { goalName, targetAmount, currentAmount: newBalance }
    });
  }
};

/**
 * Helper for smart transaction import notification
 */
const notifySmartImport = async (userId, transaction) => {
  return await createNotification({
    userId,
    title: 'Smart Import Recorded 📱',
    message: `Imported ₹${Number(transaction.amount).toLocaleString('en-IN')} (${transaction.category}) via ${transaction.paymentMethod || 'SMS'}.`,
    type: 'import_success',
    metadata: { transactionId: transaction._id, amount: transaction.amount, category: transaction.category }
  });
};

/**
 * Helper for duplicate transaction detected notification
 */
const notifyDuplicateDetected = async (userId, detected) => {
  return await createNotification({
    userId,
    title: 'Duplicate Transaction Detected ⚠️',
    message: `Potential duplicate found: ₹${Number(detected.amount).toLocaleString('en-IN')} for ${detected.category} on ${detected.date}.`,
    type: 'import_duplicate',
    metadata: { amount: detected.amount, category: detected.category, date: detected.date }
  });
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  checkBudgetThresholdNotification,
  notifySavingsContribution,
  notifySmartImport,
  notifyDuplicateDetected
};
