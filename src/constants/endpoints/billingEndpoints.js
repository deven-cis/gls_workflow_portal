// Billing-related endpoints
export const billingEndpoints = {
  get: (jobNo) => `/billings/get/${jobNo}`,
  create: () => '/billings/create',
  update: (billingId) => `/billings/update/${billingId}`,
  delete: (billingId) => `/billings/delete/${billingId}`,
};


