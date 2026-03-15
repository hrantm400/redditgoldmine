import { useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config";
import { MessageSquare, ThumbsUp, Clock, Pin, Lock } from "lucide-react";

const TopicCard = ({ topic, userLiked, onLike }) => {
  const navigate = useNavigate();
  const { user, getIdToken } = useAuth();
  const [liking, setLiking] = useState(false);
  const [likesCount, setLikesCount] = useState(topic.likesCount || 0);
  const [isLiked, setIsLiked] = useState(userLiked);

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

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) {
      navigate("/login");
      return;
    }

    if (liking) return;
    setLiking(true);

    try {
      const token = await getIdToken();
      const response = await fetch(`${API_URL}/api/forum/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetType: "topic",
          targetId: topic.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.liked);
        setLikesCount((prev) => (data.liked ? prev + 1 : prev - 1));
        if (onLike) onLike();
      }
    } catch (error) {
      console.error("Error liking topic:", error);
    } finally {
      setLiking(false);
    }
  };

  return (
    <div
      className={`topic-card card-neo p-6 cursor-pointer transition-all hover:shadow-neo-lg ${
        topic.isPinned ? "border-4 border-yellow-500" : ""
      }`}
      onClick={() => navigate(`/forum/topics/${topic.id}`)}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {topic.isPinned && <Pin className="w-4 h-4 text-yellow-600" />}
            {topic.isLocked && <Lock className="w-4 h-4 text-gray-600" />}
            <h3 className="text-xl font-display font-bold text-neo-black line-clamp-2">
              {topic.title}
            </h3>
          </div>

          <p className="text-gray-700 mb-4 line-clamp-2">{topic.content}</p>

          <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
            <span className="font-bold text-neo-main">u/{topic.authorName}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatDate(topic.createdAt)}
            </span>
            {topic.tags && topic.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {topic.tags.slice(0, 3).map((tag, idx) => (
                  <span
                    key={idx}
                    className="bg-neo-main/20 text-neo-black px-2 py-1 rounded border border-neo-black text-xs font-bold"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleLike}
            disabled={liking}
            className={`p-2 rounded border-2 border-neo-black transition-all ${
              isLiked
                ? "bg-neo-main text-white"
                : "bg-white hover:bg-neo-main/10"
            }`}
          >
            <ThumbsUp className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-neo-black">{likesCount}</span>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <MessageSquare className="w-4 h-4" />
            <span>{topic.commentsCount || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(TopicCard);

