import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config";
import CommentForm from "./CommentForm";
import { ThumbsUp, Reply, Edit, Trash2 } from "lucide-react";

const CommentItem = ({ comment, userLiked, onLike, onReply }) => {
  const { user, getIdToken } = useAuth();
  const [liking, setLiking] = useState(false);
  const [likesCount, setLikesCount] = useState(comment.likesCount || 0);
  const [isLiked, setIsLiked] = useState(userLiked);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [editing, setEditing] = useState(false);

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
    if (!user) return;

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
          targetType: "comment",
          targetId: comment.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.liked);
        setLikesCount((prev) => (data.liked ? prev + 1 : prev - 1));
        if (onLike) onLike();
      }
    } catch (error) {
      console.error("Error liking comment:", error);
    } finally {
      setLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      const token = await getIdToken();
      const response = await fetch(`${API_URL}/api/forum/comments/${comment.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        if (onLike) {
          onLike();
        }
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.message || "Failed to delete comment. You can delete only your own comments or if you are an admin.");
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Error deleting comment. Please try again.");
    }
  };

  const isOwner = user && comment.authorId === user.uid;

  return (
    <div className="comment-item card-neo p-6">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-neo-main">u/{comment.authorName}</span>
            <span className="text-sm text-gray-600">{formatDate(comment.createdAt)}</span>
            {isOwner && (
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setEditing(!editing)}
                  className="p-1 text-gray-600 hover:text-neo-main"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1 text-gray-600 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <CommentForm
              topicId={comment.topicId}
              commentId={comment.id}
              initialContent={comment.content}
              onSuccess={() => {
                setEditing(false);
                if (onLike) onLike();
              }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap mb-4">{comment.content}</p>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              disabled={liking || !user}
              className={`flex items-center gap-2 px-3 py-1 rounded border-2 border-neo-black transition-all ${
                isLiked
                  ? "bg-neo-main text-white"
                  : "bg-white hover:bg-neo-main/10"
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span>{likesCount}</span>
            </button>
            {!showReplyForm && (
              <button
                onClick={() => {
                  if (!user) return;
                  setShowReplyForm(true);
                }}
                className="flex items-center gap-2 px-3 py-1 rounded border-2 border-neo-black bg-white hover:bg-neo-main/10 transition-all"
              >
                <Reply className="w-4 h-4" />
                Reply
              </button>
            )}
          </div>

          {showReplyForm && (
            <div className="mt-4">
              <CommentForm
                topicId={comment.topicId}
                parentId={comment.id}
                onSuccess={() => {
                  setShowReplyForm(false);
                  if (onLike) onLike();
                }}
                onCancel={() => setShowReplyForm(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentItem;

