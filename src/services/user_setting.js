import { galloInstance } from './galloInstance';

/**
 * User settings / profile APIs
 * Backend router prefix: /users
 * - GET  /users/current_user
 * - POST /users/profile-picture (multipart form-data: file)
 */
export const userSettingsAPI = {
  getCurrentUser: async () => {
    const response = await galloInstance('/users/current_user');
    if (response && response.success === false) {
      const message = response?.result?.message || response?.message || 'Failed to load user profile';
      throw new Error(message);
    }
    return response?.result ?? response;
  },

  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append('file', file, file?.name);

    const response = await galloInstance('/users/profile-picture', {
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
    const response = await galloInstance('/users/profile-picture', {
      method: 'DELETE',
    });
    if (response && response.success === false) {
      const message = response?.result?.message || response?.message || 'Failed to remove profile picture';
      throw new Error(message);
    }
    return response?.result ?? response;
  },
};


