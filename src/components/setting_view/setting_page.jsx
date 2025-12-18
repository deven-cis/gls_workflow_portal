"use client";

import { useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { getUser } from "@/lib/auth";
import { useToast } from "@/contexts/ToastContext";
import { userSettingsAPI } from "@/services/user_setting";

export default function SettingPage() {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [profileImageSrc, setProfileImageSrc] = useState(null); // URL from backend (or null)
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isRemovingImage, setIsRemovingImage] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
  });
  const toast = useToast();
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const API_BASE_URL = "http://127.0.0.1:8000";
  const resolveUrl = (pathOrUrl) => {
    if (!pathOrUrl) return null;
    const s = String(pathOrUrl);
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    if (s.startsWith("/")) return `${API_BASE_URL}${s}`;
    return `${API_BASE_URL}/${s}`;
  };

  const safePathTail = (s) => {
    if (!s) return null;
    try {
      const str = String(s);
      const parts = str.split("/");
      return parts[parts.length - 1]?.slice(0, 40) || null;
    } catch {
      return null;
    }
  };

  const safePathPrefix = (pathOrUrl) => {
    if (!pathOrUrl) return null;
    try {
      const str = String(pathOrUrl);
      const pathname = str.startsWith("http://") || str.startsWith("https://") ? new URL(str).pathname : str;
      const parts = pathname.split("/").filter(Boolean);
      return `/${parts.slice(0, 2).join("/")}`;
    } catch {
      return null;
    }
  };

  const handleRemovePhoto = async () => {
    if (isRemovingImage) return;
    setIsRemovingImage(true);
    try {
      await userSettingsAPI.removeProfilePicture();
      setProfileImageSrc(null);
      toast.success("Profile picture removed");
      try {
        window.dispatchEvent(new Event("gls:profile-picture-updated"));
      } catch {}
    } catch (e) {
      // Backend DELETE endpoint may not exist yet
      toast.error(e?.message || "Failed to remove profile picture");
    } finally {
      setIsRemovingImage(false);
    }
  };

  const handleChangePhoto = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png, image/jpeg";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        setIsUploadingImage(true);
        try {
          const updated = await userSettingsAPI.uploadProfilePicture(file);
          const url = resolveUrl(updated?.profile_image_url);
          setProfileImageSrc(url);
          toast.success("Profile picture updated");
          try {
            window.dispatchEvent(new Event("gls:profile-picture-updated"));
          } catch {}
        } catch (err) {
          toast.error(err?.message || "Failed to upload profile picture");
        } finally {
          setIsUploadingImage(false);
        }
      }
    };
    input.click();
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdatePassword = () => {
    // Add password update logic here
    console.log("Updating password...", passwordData);
    setShowPasswordModal(false);
    setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
  };

  useEffect(() => {
    // Prefer backend as source-of-truth (DB)
    (async () => {
      try {
        const profile = await userSettingsAPI.getCurrentUser();
        const rawPath = profile?.profile_image_url ?? null;
        const computedUrl = resolveUrl(rawPath);
        setFormData((prev) => ({
          ...prev,
          fullName: profile?.full_name || profile?.login_name || prev.fullName,
          email: profile?.email || profile?.login_name || prev.email,
        }));
        setProfileImageSrc(computedUrl);
      } catch (e) {
        // Fallback: use local user cache for name/email only
        const u = getUser();
        if (u) {
          setFormData((prev) => ({
            ...prev,
            fullName: u.full_name || u.fullName || u.login_name || prev.fullName,
            email: u.email || u.login_name || prev.email,
          }));
        }
        console.warn("Failed to load user profile from backend", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!profileImageSrc) return;
    // Attempt to fetch the image URL to confirm status (CORS/404/401/etc).
    (async () => {
      try {
        const resp = await fetch(profileImageSrc, { method: "GET" });
        
      } catch (err) {
      }
    })();
  }, [profileImageSrc]);

  return (
    <>
      {/* Header is provided globally via `Header` in `LayoutWrapper` */}

      <main className="bg-white p-4 md:p-6 lg:p-8">
        <div className="max-w-2xl bg-white rounded-lg p-6 md:p-8">
          <div className="flex items-start gap-4 mb-8">
            <div className="relative">
              {profileImageSrc ? (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
                  <img
                    src={profileImageSrc}
                    alt="Profile"
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                Upload Profile
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Min 600×600, PNG or JPEG
              </p>
              <div className="flex gap-2">
                {profileImageSrc ? (
                  <>
                    <button
                      onClick={handleRemovePhoto}
                      disabled={isRemovingImage}
                      className={`px-4 py-2 text-sm font-medium border rounded-md transition-colors ${
                        isRemovingImage
                          ? "text-gray-400 border-gray-200 bg-gray-100 cursor-not-allowed"
                          : "text-red-600 border-red-600 hover:bg-red-50"
                      }`}
                    >
                      {isRemovingImage ? "Removing..." : "Remove"}
                    </button>
                    <button
                      onClick={handleChangePhoto}
                      disabled={isUploadingImage}
                      className={`px-4 py-2 text-sm font-medium border rounded-md transition-colors ${
                        isUploadingImage
                          ? "text-gray-400 border-gray-200 bg-gray-100 cursor-not-allowed"
                          : "text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {isUploadingImage ? "Uploading..." : "Change Photo"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleChangePhoto}
                    disabled={isUploadingImage}
                    className={`px-4 py-2 text-sm font-medium border rounded-md transition-colors ${
                      isUploadingImage
                        ? "text-gray-400 border-gray-200 bg-gray-100 cursor-not-allowed"
                        : "text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {isUploadingImage ? "Uploading..." : "Upload"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                placeholder="Jakir"
                readOnly
                disabled
                className="w-full px-4 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700 outline-none cursor-not-allowed"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                placeholder="Jakir Hossen"
                readOnly
                disabled
                className="w-full px-4 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700 outline-none cursor-not-allowed"
              />
            </div>
          </div>

          {/* Password Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                  <LockKeyhole size={20} className="text-gray-400" />
                  <div className="flex gap-1">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-gray-400"
                      />
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Password Update Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Update Password
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Please update your password to stay secure.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Old Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    name="oldPassword"
                    value={passwordData.oldPassword}
                    onChange={handlePasswordChange}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <LockKeyhole size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter New Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <LockKeyhole size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <LockKeyhole size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePassword}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
