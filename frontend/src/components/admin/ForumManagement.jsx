import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config";
import { UserPlus, UserMinus, Ban, Unlock, Trash2 } from "lucide-react";

const ForumManagement = () => {
  const { getIdToken } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [blockUserId, setBlockUserId] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;

      // Load admins
      const adminsRes = await fetch(`${API_URL}/api/admin/forum-admins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (adminsRes.ok) {
        const adminsData = await adminsRes.json();
        setAdmins(adminsData.admins || []);
      }

      // Load blocked users
      const blockedRes = await fetch(`${API_URL}/api/admin/forum-blocked-users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (blockedRes.ok) {
        const blockedData = await blockedRes.json();
        setBlockedUsers(blockedData.blockedUsers || []);
      }
    } catch (error) {
      console.error("Error loading forum management data:", error);
      setStatus("❌ Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminEmail || !newAdminEmail.includes("@")) {
      setStatus("❌ Please enter a valid email");
      return;
    }

    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/api/admin/forum-admins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: newAdminEmail }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatus(`✅ Admin ${newAdminEmail} added successfully`);
        setNewAdminEmail("");
        await loadData();
      } else {
        setStatus(`❌ ${data.message || "Error adding admin"}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const handleRemoveAdmin = async (email) => {
    if (!confirm(`Are you sure you want to remove admin ${email}?`)) return;

    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/api/admin/forum-admins/${encodeURIComponent(email)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok) {
        setStatus(`✅ Admin ${email} removed successfully`);
        await loadData();
      } else {
        setStatus(`❌ ${data.message || "Error removing admin"}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const handleBlockUser = async (e) => {
    e.preventDefault();
    if (!blockUserId) {
      setStatus("❌ Please enter a user ID");
      return;
    }

    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/api/admin/forum-block-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: blockUserId,
          reason: blockReason,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatus(`✅ User ${blockUserId} blocked successfully`);
        setBlockUserId("");
        setBlockReason("");
        await loadData();
      } else {
        setStatus(`❌ ${data.message || "Error blocking user"}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const handleUnblockUser = async (userId) => {
    if (!confirm(`Are you sure you want to unblock user ${userId}?`)) return;

    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/api/admin/forum-unblock-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatus(`✅ User ${userId} unblocked successfully`);
        await loadData();
      } else {
        setStatus(`❌ ${data.message || "Error unblocking user"}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="card-neo p-12 text-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {status && (
        <div className={`card-neo p-4 ${status.startsWith("✅") ? "bg-green-50" : "bg-red-50"}`}>
          <p className={`font-bold ${status.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>
            {status}
          </p>
        </div>
      )}

      {/* Admin Management */}
      <div className="card-neo p-6">
        <h2 className="text-3xl font-display font-bold text-neo-black mb-6">
          Admin Management
        </h2>

        <form onSubmit={handleAddAdmin} className="mb-6 space-y-4">
          <div>
            <label className="block text-lg font-heavy text-neo-black mb-2">
              Add New Admin (Email)
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                className="input-neo flex-1"
                placeholder="user@example.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                required
              />
              <button type="submit" className="btn-neo-main flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Add Admin
              </button>
            </div>
          </div>
        </form>

        <div>
          <h3 className="text-xl font-bold text-neo-black mb-4">Current Admins</h3>
          {admins.length === 0 ? (
            <p className="text-gray-600">No admins found</p>
          ) : (
            <div className="space-y-2">
              {admins.map((admin) => (
                <div
                  key={admin.email}
                  className="flex items-center justify-between p-3 bg-white border-2 border-neo-black rounded"
                >
                  <div>
                    <span className="font-bold text-neo-black">{admin.email}</span>
                    {admin.source === "environment" && (
                      <span className="ml-2 text-sm text-gray-500">(from env)</span>
                    )}
                    {admin.addedBy && (
                      <span className="ml-2 text-sm text-gray-500">
                        Added by: {admin.addedBy}
                      </span>
                    )}
                  </div>
                  {admin.source !== "environment" && (
                    <button
                      onClick={() => handleRemoveAdmin(admin.email)}
                      className="btn-neo-black text-sm flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white"
                    >
                      <UserMinus className="w-4 h-4" />
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Blocking */}
      <div className="card-neo p-6">
        <h2 className="text-3xl font-display font-bold text-neo-black mb-6">
          User Blocking
        </h2>

        <form onSubmit={handleBlockUser} className="mb-6 space-y-4">
          <div>
            <label className="block text-lg font-heavy text-neo-black mb-2">
              Block User (User ID)
            </label>
            <input
              type="text"
              className="input-neo w-full mb-2"
              placeholder="User UID from Firebase"
              value={blockUserId}
              onChange={(e) => setBlockUserId(e.target.value)}
              required
            />
            <input
              type="text"
              className="input-neo w-full"
              placeholder="Reason (optional)"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-neo-main flex items-center gap-2">
            <Ban className="w-5 h-5" />
            Block User
          </button>
        </form>

        <div>
          <h3 className="text-xl font-bold text-neo-black mb-4">Blocked Users</h3>
          {blockedUsers.length === 0 ? (
            <p className="text-gray-600">No blocked users</p>
          ) : (
            <div className="space-y-2">
              {blockedUsers.map((blocked) => (
                <div
                  key={blocked.userId}
                  className="flex items-center justify-between p-3 bg-red-50 border-2 border-red-500 rounded"
                >
                  <div>
                    <span className="font-bold text-neo-black">{blocked.userId}</span>
                    {blocked.reason && (
                      <p className="text-sm text-gray-600 mt-1">Reason: {blocked.reason}</p>
                    )}
                    {blocked.blockedBy && (
                      <p className="text-sm text-gray-500 mt-1">Blocked by: {blocked.blockedBy}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleUnblockUser(blocked.userId)}
                    className="btn-neo-black text-sm flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Unlock className="w-4 h-4" />
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForumManagement;


