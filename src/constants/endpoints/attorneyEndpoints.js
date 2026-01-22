// Attorney-related endpoints
export const attorneyEndpoints = {
  listByJob: (jobId) => `/attorneys/list/${jobId}`,
  create: () => '/attorneys/create',
  update: (attorneyId) => `/attorneys/update/${attorneyId}`,
  delete: (attorneyId) => `/attorneys/delete/${attorneyId}`,
};


