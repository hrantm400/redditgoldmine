import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config";
import NeoPage from "../NeoPage";
import NeoFooter from "../NeoFooter";
import SiteHeader from "../SiteHeader";
import CommentItem from "./CommentItem";
import CommentForm from "./CommentForm";
import ModerationPanel from "./ModerationPanel";
import { ArrowLeft, ThumbsUp, MessageSquare, Pin, Lock, Edit, Trash2 } from "lucide-react";
import gsap from "gsap";
import { useForumComments } from "../../hooks/useForumComments";

const TopicDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, getIdToken } = useAuth();
  
  // Check if user is admin
  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "0hrmelk@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  const isAdmin = user?.email && adminEmails.includes(user.email.toLowerCase());
  const [topic, setTopic] = useState(null);
  const [userLiked, setUserLiked] = useState(false);
  const [userCommentLikes, setUserCommentLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);

  // Use real-time listener for comments
  const { comments, loading: commentsLoading, error: commentsError } = useForumComments(id);

  useEffect(() => {
    loadTopic();
  }, [id]);

  // Load user likes for comments when comments change
  useEffect(() => {
    if (user && comments.length > 0) {
      loadCommentLikes();
    }
  }, [comments, user]);

  // Animate new comments when they appear
  useEffect(() => {
    if (comments.length > 0) {
      setTimeout(() => {
        if (typeof gsap !== 'undefined') {
          gsap.fromTo(
            ".comment-item",
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 }
          );
        }
      }, 100);
    }
  }, [comments.length]);

  const loadTopic = async () => {
    setLoading(true);
    try {
      const headers = {};
      if (user) {
        const token = await getIdToken();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      }

      const response = await fetch(`${API_URL}/api/forum/topics/${id}`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.topic) {
          navigate("/forum");
          return;
        }
        setTopic(data.topic);
        setUserLiked(data.userLiked || false);
        // Comments are loaded via real-time listener
      } else if (response.status === 404) {
        navigate("/forum");
      } else {
        console.error("Failed to load topic:", response.status);
        // Show error but don't crash
        setTopic(null);
      }
    } catch (error) {
      console.error("Error loading topic:", error);
      // Show error but don't crash
      setTopic(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
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
        setUserLiked(data.liked);
        setTopic((prev) => ({
          ...prev,
          likesCount: data.liked ? prev.likesCount + 1 : prev.likesCount - 1,
        }));
      }
    } catch (error) {
      console.error("Error liking topic:", error);
    } finally {
      setLiking(false);
    }
  };

  const loadCommentLikes = async () => {
    if (!user || comments.length === 0) return;

    try {
      const token = await getIdToken();
      if (!token) return;

      const commentIds = comments.map((c) => c.id);
      if (commentIds.length === 0) return;

      const response = await fetch(`${API_URL}/api/forum/likes/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetType: "comment",
          targetIds: commentIds,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUserCommentLikes(data.likedIds || []);
      }
    } catch (error) {
      console.error("Error loading comment likes:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this topic?")) return;

    try {
      const token = await getIdToken();
      const response = await fetch(`${API_URL}/api/forum/topics/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        navigate("/forum");
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.message || "Failed to delete topic. You can delete only your own topics or if you are an admin.");
      }
    } catch (error) {
      console.error("Error deleting topic:", error);
      alert("Error deleting topic. Please try again.");
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

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting date:", error, timestamp);
      return "Just now";
    }
  };

  if (loading) {
    return (
      <NeoPage>
        <SiteHeader />
        <div className="min-h-screen bg-neo-bg flex items-center justify-center">
          <div className="text-xl">Loading topic...</div>
        </div>
        <NeoFooter />
      </NeoPage>
    );
  }

  if (!topic && !loading) {
    return (
      <NeoPage>
        <SiteHeader />
        <div className="min-h-screen bg-neo-bg py-8">
          <div className="container mx-auto px-6 max-w-4xl">
            <div className="card-neo p-8 text-center">
              <h2 className="text-2xl font-display font-bold text-neo-black mb-4">
                Topic Not Found
              </h2>
              <p className="text-gray-600 mb-6">
                The topic you're looking for doesn't exist or has been deleted.
              </p>
              <button
                onClick={() => navigate("/forum")}
                className="btn-neo-main"
              >
                Back to Forum
              </button>
            </div>
          </div>
        </div>
        <NeoFooter />
      </NeoPage>
    );
  }

  const isOwner = user && topic.authorId === user.uid;

  return (
    <NeoPage>
      <SiteHeader />
      <div className="min-h-screen bg-neo-bg py-8">
      <div className="container mx-auto px-6 max-w-4xl">
        <button
          onClick={() => navigate("/forum")}
          className="mb-6 flex items-center gap-2 text-neo-black hover:text-neo-main transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Forum
        </button>

        {isAdmin && topic && (
          <ModerationPanel topic={topic} onUpdate={loadTopic} />
        )}

        <div className="card-neo p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {topic.isPinned && <Pin className="w-5 h-5 text-yellow-600" />}
                {topic.isLocked && <Lock className="w-5 h-5 text-gray-600" />}
                <h1 className="text-3xl font-display font-bold text-neo-black">
                  {topic.title}
                </h1>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <span className="font-bold text-neo-main">u/{topic.authorName}</span>
                <span>{formatDate(topic.createdAt)}</span>
                {topic.tags && topic.tags.length > 0 && (
                  <div className="flex gap-2">
                    {topic.tags.map((tag, idx) => (
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

            {isOwner && (
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/forum/topics/${id}/edit`)}
                  className="p-2 border-2 border-neo-black bg-white hover:bg-neo-main/10 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 border-2 border-neo-black bg-white hover:bg-red-500 hover:text-white transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="prose max-w-none mb-6">
            <p className="text-gray-700 whitespace-pre-wrap">{topic.content}</p>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={handleLike}
              disabled={liking}
              className={`flex items-center gap-2 px-4 py-2 rounded border-2 border-neo-black transition-all ${
                userLiked
                  ? "bg-neo-main text-white"
                  : "bg-white hover:bg-neo-main/10"
              }`}
            >
              <ThumbsUp className="w-5 h-5" />
              <span>{topic.likesCount || 0}</span>
            </button>
            <div className="flex items-center gap-2 text-gray-600">
              <MessageSquare className="w-5 h-5" />
              <span>{topic.commentsCount || 0} comments</span>
            </div>
          </div>
        </div>

        {!topic.isLocked && (
          <>
            {showCommentForm ? (
              <CommentForm
                topicId={topic.id}
                onSuccess={() => {
                  setShowCommentForm(false);
                  // Comments will update automatically via real-time listener
                }}
                onCancel={() => setShowCommentForm(false)}
              />
            ) : (
              <button
                onClick={() => {
                  if (!user) {
                    navigate("/login");
                    return;
                  }
                  setShowCommentForm(true);
                }}
                className="btn-neo-main w-full mb-6"
              >
                Add Comment
              </button>
            )}
          </>
        )}

        <div className="space-y-4">
          <h2 className="text-2xl font-display font-bold text-neo-black mb-4">
            Comments ({comments.length})
          </h2>
          {commentsLoading ? (
            <div className="card-neo p-8 text-center">
              <div className="text-lg">Loading comments...</div>
            </div>
          ) : commentsError ? (
            <div className="card-neo p-8 text-center text-red-600">
              <div className="text-lg">Error loading comments. Please refresh the page.</div>
            </div>
          ) : comments.length === 0 ? (
            <div className="card-neo p-8 text-center text-gray-600">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                userLiked={userCommentLikes.includes(comment.id)}
                onLike={loadCommentLikes}
                onReply={() => setShowCommentForm(true)}
              />
            ))
          )}
        </div>
      </div>
      </div>
      <NeoFooter />
    </NeoPage>
  );
};

export default TopicDetail;

