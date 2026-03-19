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
  uploadComplete: () => '/witnesses/uploads/complete',
  uploadCancel: () => '/witnesses/uploads/cancel',
  downloadCompleteVideo: (jobNo, witnessId) =>
    `/witnesses/${jobNo}/download_witnesses_complete_video?witness_id=${witnessId}&download_all=true`,
};
