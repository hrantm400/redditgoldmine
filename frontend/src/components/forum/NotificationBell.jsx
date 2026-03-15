import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NotificationBell = () => {
  const { user, getIdToken } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
      // Poll for new notifications every 60 seconds (less load, быстрее ощущается интерфейс)
      const interval = setInterval(loadNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const token = await getIdToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/forum/notifications?limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications.filter((n) => !n.read).length);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const token = await getIdToken();
      const response = await fetch(
        `${API_URL}/api/forum/notifications/${notificationId}/read`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
    setShowDropdown(false);
  };

  const handleMarkAllAsRead = async () => {
    if (markingAll || unreadCount === 0) return;
    try {
      setMarkingAll(true);
      // Просто пройдёмся по всем непрочитанным и используем уже рабочую логику handleMarkAsRead
      const unread = notifications.filter((n) => !n.read);
      for (const notif of unread) {
        // eslint-disable-next-line no-await-in-loop
        await handleMarkAsRead(notif.id);
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    } finally {
      setMarkingAll(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Just now";
    
    let date;
    try {
      // Firestore Timestamp object
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      }
      // Firestore Timestamp with _seconds
      else if (timestamp._seconds) {
        date = new Date(timestamp._seconds * 1000);
      }
      // Firestore Timestamp with seconds property
      else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      }
      // ISO string
      else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      }
      // Already a Date object
      else if (timestamp instanceof Date) {
        date = timestamp;
      }
      // Number (milliseconds)
      else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
      }
      else {
        console.warn("Unknown timestamp format:", timestamp);
        return "Just now";
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date:", timestamp);
        return "Just now";
      }

      const now = new Date();
      const diff = now - date;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error, timestamp);
      return "Just now";
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 border-2 border-neo-black bg-white hover:bg-neo-main/10 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white border-4 border-neo-black shadow-neo-lg z-50 max-h-96 overflow-y-auto">
            <div className="p-4 border-b-4 border-neo-black bg-neo-main flex items-center justify-between gap-2">
              <h3 className="font-bold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markingAll}
                  className="text-xs font-bold px-2 py-1 border-2 border-white bg-neo-black text-white hover:bg-white hover:text-neo-black transition-colors"
                >
                  {markingAll ? "Marking..." : "Mark all as read"}
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-600">
                No notifications
              </div>
            ) : (
              <div className="divide-y-2 divide-neo-black">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer transition-colors ${
                      !notification.read
                        ? "bg-blue-50 hover:bg-blue-100"
                        : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    <p className="text-sm font-bold text-neo-black mb-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-600">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;

