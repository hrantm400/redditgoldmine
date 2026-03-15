import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config";
import NeoPage from "../NeoPage";
import NeoFooter from "../NeoFooter";
import SiteHeader from "../SiteHeader";
import { X } from "lucide-react";

const CreateTopicForm = ({ onSuccess }) => {
  const { id: topicId } = useParams();
  const navigate = useNavigate();
  const { user, getIdToken } = useAuth();
  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(!!topicId);
  const [tagInput, setTagInput] = useState("");
  const [popularTags, setPopularTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
    loadPopularTags();
    if (topicId) {
      loadTopic();
    }
  }, [topicId]);

  const loadTopic = async () => {
    try {
      const response = await fetch(`${API_URL}/api/forum/topics/${topicId}`);
      if (response.ok) {
        const data = await response.json();
        const topic = data.topic;
        setTitle(topic.title);
        setContent(topic.content);
        setCategoryId(topic.categoryId);
        setTags(topic.tags || []);
      }
    } catch (error) {
      console.error("Error loading topic:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/forum/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
        if (data.length > 0 && !categoryId) {
          setCategoryId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const loadPopularTags = async () => {
    try {
      const response = await fetch(`${API_URL}/api/forum/tags?limit=10`);
      if (response.ok) {
        const data = await response.json();
        setPopularTags(data.tags || []);
      }
    } catch (error) {
      console.error("Error loading tags:", error);
    }
  };

  const handleAddTag = (tagName) => {
    const tag = tagName.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !categoryId || submitting) return;

    setSubmitting(true);
    try {
      const token = await getIdToken();
      const url = topicId
        ? `${API_URL}/api/forum/topics/${topicId}`
        : `${API_URL}/api/forum/topics`;

      const method = topicId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          categoryId,
          tags,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (onSuccess) {
          onSuccess(data.topic);
        } else {
          navigate(`/forum/topics/${topicId || data.topic.id}`);
        }
      } else {
        const errorData = await response.json();
        alert(errorData.message || "Failed to save topic");
      }
    } catch (error) {
      console.error("Error saving topic:", error);
      alert("Failed to save topic");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <NeoPage>
        <SiteHeader />
        <div className="min-h-screen bg-neo-bg flex items-center justify-center">
          <div className="text-xl">Loading...</div>
        </div>
        <NeoFooter />
      </NeoPage>
    );
  }

  return (
    <NeoPage>
      <SiteHeader />
      <div className="min-h-screen bg-neo-bg py-8">
      <div className="container mx-auto px-6 max-w-3xl">
        <button
          onClick={() => navigate("/forum")}
          className="mb-6 flex items-center gap-2 text-neo-black hover:text-neo-main transition-colors"
        >
          <X className="w-5 h-5" />
          Cancel
        </button>

        <form onSubmit={handleSubmit} className="card-neo p-8">
          <h2 className="text-3xl font-display font-bold text-neo-black mb-6">
            {topicId ? "Edit Topic" : "Create New Topic"}
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-neo-black mb-2">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-3 border-4 border-neo-black bg-white focus:outline-none focus:ring-4 focus:ring-neo-main"
                required
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-neo-black mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter topic title..."
                className="w-full p-3 border-4 border-neo-black bg-white focus:outline-none focus:ring-4 focus:ring-neo-main"
                required
                maxLength={200}
              />
              <p className="text-xs text-gray-600 mt-1">{title.length}/200</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-neo-black mb-2">
                Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your topic content..."
                rows={10}
                className="w-full p-3 border-4 border-neo-black bg-white focus:outline-none focus:ring-4 focus:ring-neo-main resize-none"
                required
                maxLength={10000}
              />
              <p className="text-xs text-gray-600 mt-1">{content.length}/10000</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-neo-black mb-2">
                Tags (max 5)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag(tagInput);
                    }
                  }}
                  placeholder="Add tag..."
                  className="flex-1 p-3 border-4 border-neo-black bg-white focus:outline-none focus:ring-4 focus:ring-neo-main"
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(tagInput)}
                  className="btn-neo-main px-4"
                >
                  Add
                </button>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-neo-main/20 text-neo-black px-3 py-1 rounded border-2 border-neo-black flex items-center gap-2"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {popularTags.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 mb-2">Popular tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {popularTags.slice(0, 10).map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleAddTag(tag.name)}
                        disabled={tags.includes(tag.name.toLowerCase()) || tags.length >= 5}
                        className="text-xs px-2 py-1 border-2 border-neo-black bg-white hover:bg-neo-main/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        #{tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting || !title.trim() || !content.trim() || !categoryId}
                className="btn-neo-main flex-1 disabled:opacity-50"
              >
                {submitting ? "Saving..." : topicId ? "Update Topic" : "Create Topic"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/forum")}
                className="btn-neo-black"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
      </div>
      <NeoFooter />
    </NeoPage>
  );
};

export default CreateTopicForm;

