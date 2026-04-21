// Witness-related endpoints
export const witnessEndpoints = {
  get: (witnessId) => `/witnesses/get/${witnessId}`,
  listByJob: (jobNo) => `/witnesses/list/${jobNo}`,
  createName: () => '/witnesses/create-name',
  addToCase: (caseId) => `/witnesses/add/case/${caseId}`,
  delete: (witnessId) => `/witnesses/delete/${witnessId}`,
  updateName: (witnessId) => `/witnesses/name/${witnessId}`,
  saveAll: () => '/witnesses/save-all',
  uploadInit: () => '/witnesses/uploads/init',
  uploadChunk: () => '/witnesses/uploads/chunk',
  uploadMultipartPartUrl: () => '/witnesses/uploads/multipart/part-url',
  uploadComplete: () => '/witnesses/uploads/complete',
  uploadPause: () => '/witnesses/uploads/pause',
  uploadResume: () => '/witnesses/uploads/resume',
  uploadCancel: () => '/witnesses/uploads/cancel',
  downloadVideoLink: (videoId) => `/witnesses/videos/${videoId}/download-link`,
  requestCompleteVideoMerge: (witnessId) => `/witnesses/${witnessId}/complete-video/request`,
  completeVideoStatus: (witnessId) => `/witnesses/${witnessId}/complete-video/status`,
  completeVideoDownloadLink: (witnessId) => `/witnesses/${witnessId}/complete-video/download-link`,
  completeVideoDownload: (witnessId) => `/witnesses/${witnessId}/complete-video/download`,
  downloadCompleteVideo: (jobNo, witnessId) =>
    `/witnesses/${jobNo}/download_witnesses_complete_video?witness_id=${witnessId}&download_all=true`,
};
