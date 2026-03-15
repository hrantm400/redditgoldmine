import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NeoPage from "../components/NeoPage";
import NeoFooter from "../components/NeoFooter";
import SiteHeader from "../components/SiteHeader";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

const ProfilePage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const isGoogleUser = user?.providerData?.some((provider) => provider.providerId === "google.com") || false;
  const hasPassword = user?.providerData?.some((provider) => provider.providerId === "password") || false;

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <NeoPage>
        <SiteHeader />
        <main className="w-full py-24 flex justify-center text-lg font-heavy">Loading...</main>
        <NeoFooter />
      </NeoPage>
    );
  }

  if (!user) {
    return null;
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setPasswordStatus("");

    // Currently we rely on forgot-password link for updates.
    setPasswordStatus("To set or change a password, please use 'Forgot Password' from the login page with your email.");
    setIsSubmitting(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== "delete") {
      setDeleteError("Please type 'delete' to confirm");
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      // In a real implementation this would hit a DELETE /api/user endpoint
      setPasswordStatus("Delete account is temporarily disabled during migration.");
      setShowDeleteModal(false);
    } catch (error) {
       console.error("Delete account error:", error);
       setDeleteError(`Error: ${error.message}`);
    } finally {
       setIsDeleting(false);
    }
  };

  return (
    <NeoPage>
      <SiteHeader />

      <main className="w-full py-12 md:py-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-display font-extrabold text-neo-black mb-12 g-fade-in">
            Your <span className="text-outline">Profile</span>
          </h1>

          <div className="space-y-12">
            <div className="card-neo g-fade-in">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-32 h-32 bg-neo-accent border-4 border-neo-black flex-shrink-0 flex items-center justify-center overflow-hidden rounded-full shadow-neo relative">
                  {user?.photoURL || user?.providerData?.[0]?.photoURL ? (
                    <>
                      <img
                        src={user?.photoURL || user?.providerData?.[0]?.photoURL}
                        alt={user?.displayName || "Avatar"}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          console.warn("Failed to load user photo:", user?.photoURL || user?.providerData?.[0]?.photoURL);
                          e.target.style.display = 'none';
                          const fallback = e.target.nextElementSibling;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                        onLoad={() => {
                          const fallback = e.target.nextElementSibling;
                          if (fallback) fallback.style.display = 'none';
                        }}
                      />
                      <span
                        className="avatar-fallback text-neo-black text-4xl font-heavy hidden"
                        style={{ display: 'none' }}
                      >
                        {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    </>
                  ) : (
                    <span className="text-neo-black text-4xl font-heavy">
                      {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  )}
                </div>
                <div className="flex-grow text-center sm:text-left">
                  <h2 className="text-4xl font-display font-bold text-neo-black">{user?.displayName || user?.email?.split("@")[0] || "User"}</h2>
                  <p className="text-xl text-gray-600 mt-1">{user?.email || "No email"}</p>
                  {isGoogleUser && (
                    <span className="inline-block mt-2 px-3 py-1 bg-neo-accent text-neo-black text-sm font-bold border-2 border-neo-black">
                      Google Account
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="card-neo g-fade-in">
              <h2 className="text-3xl font-display font-bold text-neo-black mb-6">Security</h2>
              {isGoogleUser && !hasPassword ? (
                <div className="space-y-6">
                  <p className="text-gray-700">
                    You signed in with Google. To set a password for your account, use the "Forgot Password" option on the login page with your email address.
                  </p>
                  <a href="/login" className="btn-neo-main text-lg inline-block">
                    Go to Login
                  </a>
                </div>
              ) : (
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="current-password" className="block text-lg font-heavy text-neo-black mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      id="current-password"
                      className="input-neo"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="new-password" className="block text-lg font-heavy text-neo-black mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      id="new-password"
                      className="input-neo"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  {passwordStatus && (
                    <p className={`text-lg font-bold ${passwordStatus.startsWith("✅") ? "text-green-600" : "text-neo-main"}`}>
                      {passwordStatus}
                    </p>
                  )}
                  <button type="submit" className="btn-neo-main text-lg" disabled={isSubmitting}>
                    {isSubmitting ? "Updating..." : "Update Password"}
                  </button>
                </form>
              )}
            </div>

            <div className="card-neo border-neo-main g-fade-in">
              <h2 className="text-3xl font-display font-bold text-neo-main mb-4">Danger Zone</h2>
              <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => {
                      try {
                        const { logout } = useAuth();
                        logout();
                        navigate("/");
                      } catch (error) {
                        console.error("Logout error:", error);
                        navigate("/");
                      }
                    }}
                    className="btn-neo-black text-lg"
                  >
                    Logout
                  </button>
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className="btn-neo-main text-lg"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteModal(false);
              setDeleteConfirmText("");
              setDeleteError("");
            }
          }}
        >
          <div className="card-neo max-w-md w-full border-4 border-red-600 shadow-neo bg-white">
            <h2 className="text-3xl font-display font-bold text-neo-black mb-4">
              ⚠️ Delete Account
            </h2>
            <p className="text-gray-700 mb-6">
              This action cannot be undone. This will permanently delete your account and remove all your data.
            </p>
            <p className="text-lg font-bold text-neo-black mb-2">
              Type <span className="text-red-600 font-heavy">"delete"</span> to confirm:
            </p>
            <input
              type="text"
              className="input-neo mb-4"
              placeholder="Type 'delete' here"
              value={deleteConfirmText}
              onChange={(e) => {
                setDeleteConfirmText(e.target.value);
                setDeleteError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && deleteConfirmText.toLowerCase() === "delete" && !isDeleting) {
                  handleDeleteAccount();
                }
                if (e.key === "Escape") {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                  setDeleteError("");
                }
              }}
              autoFocus
            />
            {deleteError && (
              <p className="text-red-600 font-bold mb-4">{deleteError}</p>
            )}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                  setDeleteError("");
                }}
                className="btn-neo-black text-lg flex-1"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="btn-neo text-lg flex-1 bg-red-600 text-white border-red-800 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDeleting || deleteConfirmText.toLowerCase() !== "delete"}
              >
                {isDeleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      <NeoFooter />
    </NeoPage>
  );
};

export default ProfilePage;

