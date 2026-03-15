import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config";
import { Send, X } from "lucide-react";

const CommentForm = ({ topicId, commentId, parentId, initialContent, onSuccess, onCancel }) => {
  const { user, getIdToken } = useAuth();
  const [content, setContent] = useState(initialContent || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      const token = await getIdToken();
      const url = commentId
        ? `${API_URL}/api/forum/comments/${commentId}`
        : `${API_URL}/api/forum/topics/${topicId}/comments`;

      const method = commentId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: content.trim(),
          ...(parentId && { parentId }),
        }),
      });

      if (response.ok) {
        setContent("");
        if (onSuccess) onSuccess();
      } else {
        const data = await response.json();
        alert(data.message || "Failed to save comment");
      }
    } catch (error) {
      console.error("Error saving comment:", error);
      alert("Failed to save comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-neo p-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={commentId ? "Edit your comment..." : "Write a comment..."}
        rows={4}
        className="w-full p-3 border-4 border-neo-black bg-white focus:outline-none focus:ring-4 focus:ring-neo-main mb-4 resize-none"
        required
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="btn-neo-main flex items-center gap-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {commentId ? "Update" : "Post"} Comment
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn-neo-black flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default CommentForm;


