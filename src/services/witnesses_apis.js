const GALLo_URL = 'http://127.0.0.1:8000'; 

const API_BASE_URL = GALLo_URL;

import { galloInstance } from './galloInstance';
export const witnessesAPI = {
    getWitness: async (witnessId) => {
        const response = await galloInstance(`/witnesses/get/${witnessId}`);
        return response;
    },
    getJobWitnesses: async (jobId) => {
        const response = await galloInstance(`/witnesses/get/${jobId}`);
        return response;
    },
    addWitnessToCase: async (caseId, witnessId) => {
        const response = await galloInstance(`/witnesses/add/case/${caseId}`, {
            method: 'POST',
            body: JSON.stringify({ case_id: caseId, witness_id: witnessId }),
        });
        return response;
    },
    deleteWitness: async (witnessId) => {
        const response = await galloInstance(`/witnesses/delete/${witnessId}`, {
            method: 'DELETE',
            body: JSON.stringify({ case_id: caseId, witness_id: witnessId }),
        });
        return response;
    },
};