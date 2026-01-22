import { authEndpoints } from './endpoints/authEndpoints';
import { userEndpoints } from './endpoints/userEndpoints';
import { billingEndpoints } from './endpoints/billingEndpoints';
import { equipmentTimeEndpoints } from './endpoints/equipmentTimeEndpoints';
import { caseEndpoints } from './endpoints/caseEndpoints';
import { jobEndpoints } from './endpoints/jobEndpoints';
import { taskEndpoints } from './endpoints/taskEndpoints';
import { witnessEndpoints } from './endpoints/witnessEndpoints';
import { attorneyEndpoints } from './endpoints/attorneyEndpoints';

export const endpoints = {
  auth: authEndpoints,
  users: userEndpoints,
  billings: billingEndpoints,
  equipmentTime: equipmentTimeEndpoints,
  cases: caseEndpoints,
  jobs: jobEndpoints,
  tasks: taskEndpoints,
  witnesses: witnessEndpoints,
  attorneys: attorneyEndpoints,
};

// Re-export per-domain groups for direct imports
export {
  authEndpoints,
  userEndpoints,
  billingEndpoints,
  equipmentTimeEndpoints,
  caseEndpoints,
  jobEndpoints,
  taskEndpoints,
  witnessEndpoints,
  attorneyEndpoints,
};

