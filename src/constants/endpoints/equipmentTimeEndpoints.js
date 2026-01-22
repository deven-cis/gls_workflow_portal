// Equipment time-related endpoints
export const equipmentTimeEndpoints = {
  get: (jobNo) => `/equipment-time/get/${jobNo}`,
  create: () => '/equipment-time/create',
  update: (equipmentTimeId) => `/equipment-time/update/${equipmentTimeId}`,
  delete: (equipmentTimeId) => `/equipment-time/delete/${equipmentTimeId}`,
};