// Task-related endpoints
export const taskEndpoints = {
  list: (queryString) => (queryString ? `/tasks?${queryString}` : '/tasks'),
  create: () => '/tasks',
  update: (taskId) => `/tasks/${taskId}`,
  delete: (taskId) => `/tasks/${taskId}`,
  uploadVideo: (taskId) => `/tasks/${taskId}/upload-video`,
};


