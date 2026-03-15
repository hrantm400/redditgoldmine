import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config";
import { Pin, Lock, Unlock, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ModerationPanel = ({ topic, onUpdate }) => {
  const { getIdToken } = useAuth();
  const navigate = useNavigate();
  const [actioning, setActioning] = useState(false);

  const handleModeration = async (action, data = {}) => {
    if (actioning) return;
    setActioning(true);

    try {
      const token = await getIdToken();
      const response = await fetch(`${API_URL}/api/forum/moderate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          targetType: "topic",
          targetId: topic.id,
          data,
        }),
      });

      if (response.ok) {
        if (action === "delete") {
          navigate("/forum");
        } else if (onUpdate) {
          onUpdate();
        }
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.message || "Moderation action failed");
      }
    } catch (error) {
      console.error("Error moderating:", error);
      alert("Moderation error. Please try again.");
    } finally {
      setActioning(false);
    }
  };

  return (
    <div className="card-neo p-4 border-4 border-yellow-500 bg-yellow-50">
      <h4 className="font-bold text-neo-black mb-3">Moderation Actions</h4>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleModeration(topic.isPinned ? "unpin" : "pin")}
          disabled={actioning}
          className="btn-neo-black text-sm flex items-center gap-2"
        >
          <Pin className="w-4 h-4" />
          {topic.isPinned ? "Unpin" : "Pin"}
        </button>
        <button
          onClick={() => handleModeration(topic.isLocked ? "unlock" : "lock")}
          disabled={actioning}
          className="btn-neo-black text-sm flex items-center gap-2"
        >
          {topic.isLocked ? (
            <>
              <Unlock className="w-4 h-4" />
              Unlock
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Lock
            </>
          )}
        </button>
        <button
          onClick={() => {
            if (confirm("Are you sure you want to delete this topic?")) {
              handleModeration("delete");
            }
          }}
          disabled={actioning}
          className="btn-neo-black text-sm flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  );
};

export default ModerationPanel;


