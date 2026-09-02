import React, { useState, useEffect, useRef, useCallback } from 'react';
import { notificationsApi } from '../services/api';
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  PiggyBank,
  Sparkles,
  Copy,
  Info,
  Clock,
  Inbox
} from 'lucide-react';

/**
 * Format relative timestamps
 */
function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return 'Yesterday';
  }
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Helper to pick icon & color styling based on notification type
 */
function getNotificationIcon(type) {
  switch (type) {
    case 'budget_exceeded':
      return {
        icon: <AlertCircle size={16} color="#ef4444" />,
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.3)'
      };
    case 'budget_warning':
    case 'budget_limit':
      return {
        icon: <AlertTriangle size={16} color="#f59e0b" />,
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.3)'
      };
    case 'savings_contribution':
      return {
        icon: <PiggyBank size={16} color="#10b981" />,
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.3)'
      };
    case 'savings_completed':
      return {
        icon: <Sparkles size={16} color="#ec4899" />,
        bg: 'rgba(236, 72, 153, 0.15)',
        border: 'rgba(236, 72, 153, 0.3)'
      };
    case 'import_success':
      return {
        icon: <Sparkles size={16} color="#6366f1" />,
        bg: 'rgba(99, 102, 241, 0.15)',
        border: 'rgba(99, 102, 241, 0.3)'
      };
    case 'import_duplicate':
      return {
        icon: <Copy size={16} color="#f59e0b" />,
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.3)'
      };
    default:
      return {
        icon: <Info size={16} color="#0ea5e9" />,
        bg: 'rgba(14, 165, 233, 0.15)',
        border: 'rgba(14, 165, 233, 0.3)'
      };
  }
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const dropdownRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationsApi.getAll();
      if (response && response.success && response.data) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Poll periodically every 20 seconds
    const interval = setInterval(fetchNotifications, 20000);

    // Refresh on window focus
    const onFocus = () => fetchNotifications();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchNotifications]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Mark single notification as read
  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      const res = await notificationsApi.markAsRead(id);
      if (res && res.success && res.data) {
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      console.warn('Failed to mark notification as read:', err.message);
      fetchNotifications();
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);

      await notificationsApi.markAllAsRead();
    } catch (err) {
      console.warn('Failed to mark all notifications as read:', err.message);
      fetchNotifications();
    }
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  return (
    <div className="notification-bell-container" ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell Trigger Button */}
      <button
        id="btn-notification-bell"
        type="button"
        className={`notification-bell-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span id="badge-unread-notifications" className="notification-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div id="notification-dropdown-panel" className="notification-dropdown">
          {/* Header */}
          <div className="notification-dropdown-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="notification-unread-pill">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                id="btn-mark-all-read"
                type="button"
                className="btn-link"
                onClick={handleMarkAllAsRead}
                style={{
                  fontSize: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  color: 'var(--accent-primary)',
                  fontWeight: 600,
                  padding: '0.2rem 0.4rem',
                  borderRadius: '4px'
                }}
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Filter Bar */}
          {notifications.length > 0 && (
            <div className="notification-filter-bar">
              <button
                type="button"
                className={`notif-filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                className={`notif-filter-btn ${filter === 'unread' ? 'active' : ''}`}
                onClick={() => setFilter('unread')}
              >
                Unread ({unreadCount})
              </button>
            </div>
          )}

          {/* Notification List Body */}
          <div className="notification-list-body">
            {filteredNotifications.length === 0 ? (
              <div className="notification-empty-state">
                <div className="notification-empty-icon">
                  <Inbox size={28} color="var(--text-muted)" />
                </div>
                <p style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '0.25rem' }}>
                  {filter === 'unread' ? 'No unread notifications' : 'All caught up!'}
                </p>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {filter === 'unread'
                    ? 'You have read all your alerts and updates.'
                    : 'Important budget, savings, and import updates will appear here.'}
                </span>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const style = getNotificationIcon(notif.type);
                return (
                  <div
                    key={notif._id}
                    id={`notification-item-${notif._id}`}
                    className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                    onClick={() => {
                      if (!notif.isRead) {
                        handleMarkAsRead(notif._id);
                      }
                    }}
                  >
                    {/* Icon Badge */}
                    <div
                      className="notification-icon-box"
                      style={{
                        background: style.bg,
                        borderColor: style.border
                      }}
                    >
                      {style.icon}
                    </div>

                    {/* Content */}
                    <div className="notification-content">
                      <div className="notification-title-row">
                        <span className="notification-title">{notif.title}</span>
                        {!notif.isRead && <span className="notification-dot" />}
                      </div>
                      <p className="notification-message">{notif.message}</p>
                      <div className="notification-meta">
                        <Clock size={11} />
                        <span>{formatTimeAgo(notif.createdAt)}</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    {!notif.isRead && (
                      <button
                        type="button"
                        className="btn-icon-subtle notif-read-btn"
                        title="Mark as read"
                        onClick={(e) => handleMarkAsRead(notif._id, e)}
                        aria-label="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
