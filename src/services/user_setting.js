import { galloInstance } from './galloInstance';
import { endpoints } from '@/constants/endpoints';

/**
 * User settings / profile APIs
 * Backend router prefix: /users
 * - GET  /users/current_user
 * - POST /users/profile-picture (multipart form-data: file)
 */
export const userSettingsAPI = {
  getCurrentUser: async () => {
    const response = await galloInstance(endpoints.users.currentUser());
    if (response && response.success === false) {
      const message = response?.result?.message || response?.message || 'Failed to load user profile';
      throw new Error(message);
    }
    return response?.result ?? response;
  },

  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append('file', file, file?.name);

    const response = await galloInstance(endpoints.users.profilePicture(), {
      method: 'POST',
      body: formData,
      // ensure multipart boundary is set by browser
      headers: { 'Content-Type': undefined },
    });
    if (response && response.success === false) {
      const message = response?.result?.message || response?.message || 'Failed to upload profile picture';
      throw new Error(message);
    }
    return response?.result ?? response;
  },

  // Backend endpoint not provided yet; implement when available.
  // Expected: DELETE /users/profile-picture
  removeProfilePicture: async () => {
    const response = await galloInstance(endpoints.users.profilePicture(), {
      method: 'DELETE',
    });
    if (response && response.success === false) {
      const message = response?.result?.message || response?.message || 'Failed to remove profile picture';
      throw new Error(message);
    }
    return response?.result ?? response;
  },

  changePassword: async (rsrcNo, oldPassword, newPassword) => {
    const response = await galloInstance(endpoints.users.changePassword(), {
      method: 'POST',
      body: JSON.stringify({
        rsrc_no: rsrcNo,
        old_password: oldPassword,
        new_password: newPassword,
      }),
    });
    if (response && response.success === false) {
      const message = response?.result?.message || response?.message || 'Failed to change password';
      throw new Error(message);
    }
    return response?.result ?? response;
  },
};


