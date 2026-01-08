"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Eye, EyeOff } from "lucide-react";
import { getUser, logout } from "@/lib/auth";
import { useToast } from "@/contexts/ToastContext";
import { userSettingsAPI } from "@/services/user_setting";
import { resolveFileUrl } from "@/lib/config";
import { getInitials } from "@/lib/utils";

export default function SettingPage() {
  const router = useRouter();
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
  const [showPasswords, setShowPasswords] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [passwordError, setPasswordError] = useState("");
  const [oldPasswordError, setOldPasswordError] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [samePasswordError, setSamePasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [userId, setUserId] = useState(null);

  const resolveUrl = resolveFileUrl;

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

  // Validate new password strength
  const validateNewPassword = (password) => {
    const errors = [];
    
    if (password.length < 8 || 
        !/[a-z]/.test(password) || 
        !/[0-9]/.test(password) || 
        !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push("Use 8+ chars with alphabet, number & symbol.");
    }
    
    return errors;
  };

  const handlePasswordChange = (e) => {
    const newData = {
      ...passwordData,
      [e.target.name]: e.target.value,
    };
    setPasswordData(newData);
    
    // Clear old password error when user types
    if (e.target.name === "oldPassword") {
      setOldPasswordError("");
    }
    
    // Validate new password strength (when typing in newPassword OR confirmPassword)
    if (e.target.name === "newPassword" || e.target.name === "confirmPassword") {
      if (newData.newPassword) {
        const validationErrors = validateNewPassword(newData.newPassword);
        if (validationErrors.length > 0) {
          setNewPasswordError(validationErrors[0]); // Show error message
        } else {
          setNewPasswordError("");
        }
      } else {
        setNewPasswordError("");
      }
    }
    
    // Validate old password and new password are not the same
    if (newData.oldPassword && newData.newPassword) {
      if (newData.oldPassword === newData.newPassword) {
        setSamePasswordError("New password must be different from old password");
      } else {
        setSamePasswordError("");
      }
    } else {
      setSamePasswordError("");
    }
    
    // Validate passwords match
    if (newData.newPassword && newData.confirmPassword) {
      if (newData.newPassword !== newData.confirmPassword) {
        setPasswordError("New password and confirm password must match");
      } else {
        setPasswordError("");
      }
    } else if (e.target.name === "confirmPassword" && !newData.confirmPassword) {
      // Clear password error when confirm password is cleared
      setPasswordError("");
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const isPasswordFormValid = () => {
    // Check if all fields are filled
    if (!passwordData.oldPassword.trim() || !passwordData.newPassword.trim() || !passwordData.confirmPassword.trim()) {
      return false;
    }
    
    // Validate new password strength
    const newPasswordValidationErrors = validateNewPassword(passwordData.newPassword);
    if (newPasswordValidationErrors.length > 0) {
      return false;
    }
    
    // Check if old password and new password are the same
    if (passwordData.oldPassword === passwordData.newPassword) {
      return false;
    }
    
    // Check if passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return false;
    }
    
    // All validations passed
    return true;
  };

  const handleUpdatePassword = async () => {
    // Validate all fields before proceeding
    if (!passwordData.oldPassword.trim()) {
      setOldPasswordError("Old password is required");
      return;
    }
    
    if (!passwordData.newPassword.trim()) {
      setNewPasswordError("New password is required");
      return;
    }
    
    // Validate new password strength
    const newPasswordValidationErrors = validateNewPassword(passwordData.newPassword);
    if (newPasswordValidationErrors.length > 0) {
      setNewPasswordError(newPasswordValidationErrors[0]);
      return;
    }
    
    // Check if old password and new password are the same
    if (passwordData.oldPassword === passwordData.newPassword) {
      setSamePasswordError("New password must be different from old password");
      return;
    }
    
    if (!passwordData.confirmPassword.trim()) {
      setPasswordError("Please confirm your new password");
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New password and confirm password must match");
      return;
    }

    if (!userId) {
      toast.error("User ID not found. Please refresh the page.");
      return;
    }

    setIsChangingPassword(true);
    setOldPasswordError("");
    setPasswordError("");
    setNewPasswordError("");
    setSamePasswordError("");

    try {
      await userSettingsAPI.changePassword(
        userId,
        passwordData.oldPassword,
        passwordData.newPassword
      );
      
      toast.success("Password changed successfully.");
      
      // Close modal and reset form
      setShowPasswordModal(false);
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswords({ oldPassword: false, newPassword: false, confirmPassword: false });
      setPasswordError("");
      setOldPasswordError("");
      setNewPasswordError("");
      setSamePasswordError("");
      
    } catch (error) {
      const errorMessage = error?.message || "Failed to change password";
      
      // Check if it's an old password error
      if (errorMessage.toLowerCase().includes("old password") || 
          errorMessage.toLowerCase().includes("incorrect")) {
        setOldPasswordError(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsChangingPassword(false);
    }
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
        // Get user_id from profile (could be user_id, id, or user_id)
        setUserId(profile?.user_id || profile?.id || profile?.user_id);
      } catch (e) {
        // Fallback: use local user cache for name/email only
        const u = getUser();
        if (u) {
          setFormData((prev) => ({
            ...prev,
            fullName: u.full_name || u.fullName || u.login_name || prev.fullName,
            email: u.email || u.login_name || prev.email,
          }));
          // Get user_id from local user cache
          setUserId(u?.user_id || u?.id || u?.user_id);
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
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-white">
                    {getInitials(formData.fullName || 'User')}
                  </span>
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
                    type={showPasswords.oldPassword ? "text" : "password"}
                    name="oldPassword"
                    value={passwordData.oldPassword}
                    onChange={handlePasswordChange}
                    className={`w-full pl-10 pr-10 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 ${
                      oldPasswordError ? "border-red-500" : "border-gray-300"
                    }`}
                    autoComplete="current-password"
                  />
                  <LockKeyhole size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("oldPassword")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.oldPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {oldPasswordError && (
                  <p className="mt-1 text-sm text-red-600">{oldPasswordError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.newPassword ? "text" : "password"}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className={`w-full pl-10 pr-10 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 ${
                      newPasswordError || passwordError || samePasswordError ? "border-red-500" : "border-gray-300"
                    }`}
                    autoComplete="new-password"
                  />
                  <LockKeyhole size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("newPassword")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.newPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {newPasswordError && (
                  <p className="mt-1 text-sm text-red-600">{newPasswordError}</p>
                )}
                {samePasswordError && (
                  <p className="mt-1 text-sm text-red-600">{samePasswordError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className={`w-full pl-10 pr-10 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 ${
                      passwordError ? "border-red-500" : "border-gray-300"
                    }`}
                    autoComplete="confirm-password"
                  />
                  <LockKeyhole size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("confirmPassword")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-1 text-sm text-red-600">{passwordError}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
                  setShowPasswords({ oldPassword: false, newPassword: false, confirmPassword: false });
                  setPasswordError("");
                  setOldPasswordError("");
                  setNewPasswordError("");
                  setSamePasswordError("");
                }}
                disabled={isChangingPassword}
                className={`px-4 py-2 text-sm font-medium border border-gray-300 rounded-md transition-colors ${
                  isChangingPassword
                    ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePassword}
                disabled={!isPasswordFormValid() || isChangingPassword}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isPasswordFormValid() && !isChangingPassword
                    ? "text-white bg-red-600 hover:bg-red-700"
                    : "text-gray-400 bg-gray-300 cursor-not-allowed"
                }`}
              >
                {isChangingPassword
                  ? "Changing..."
                  : isPasswordFormValid()
                  ? "Change Password"
                  : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
