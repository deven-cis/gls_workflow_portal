// Job-related endpoints
export const jobEndpoints = {
  pending: () => '/jobs/pending/',
  upcoming: () => '/jobs/upcoming/',
  getMarkIsDoneDetails: (jobNo, caseId) => `/jobs/get/${jobNo}/${caseId}`,
  cancel: (jobNo) => `/jobs/${jobNo}/cancel`,
  markAsDone: (jobNo, type) => `/jobs/${jobNo}/mark_as_done/${type}`,

  calendarEvents: (queryString) =>
    queryString ? `/jobs/calendar/events?${queryString}` : '/jobs/calendar/events',

  cancelledAndCompletedJobs: (type, queryString) =>
    `/jobs/cancelled_and_completed_jobs/${type}?${queryString}`,

  completedDetails: (jobNo) => `/jobs/get/${jobNo}/completed_details`,
  cancelledDetails: (jobNo) => `/jobs/get/${jobNo}/cancelled_details`,

  sessionStart: (jobNo) => `/jobs/${jobNo}/session/start`,
  sessionEnd: (jobNo) => `/jobs/${jobNo}/session/end`,
  sessionStartTime: (jobNo) => `/jobs/get/${jobNo}/session_start_time/`,
  
  reassign: () => '/jobs/reassign',
};


