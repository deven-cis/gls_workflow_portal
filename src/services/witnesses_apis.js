const GALLo_URL = 'http://127.0.0.1:8000'; 

const API_BASE_URL = GALLo_URL;

import { galloInstance } from './galloInstance';
export const witnessesAPI = {
    getWitness: async (witnessId) => {
        const response = await galloInstance(`/witnesses/get/${witnessId}`);
        // Backend returns: { status_code, message, success, result }
        return response?.result ?? response;
    },
    getJobWitnesses: async (jobId) => {
        // Backend: GET /witnesses/list/{job_no}
        const response = await galloInstance(`/witnesses/list/${jobId}`);
        console.log('✅ API: Witnesses response:', response);
        // Backend returns: { status_code, message, success, result: [] }
        return response?.result || [];
    },

    createJObWitness: async (witnessData) => {
        console.log('Creating witness with data:', witnessData);
        const response = await galloInstance('/witnesses/create-name', {
            method: 'POST',
            body: JSON.stringify(witnessData),
        });
        console.log('Witness creation response:', response);
        if (response && response.success === false) {
            const message = response?.message || 'Failed to create witness';
            throw new Error(message);
        }
        return response?.result ?? response;
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
        });
        if (response && response.success === false) {
            const message = response?.message || 'Failed to archive witness';
            throw new Error(message);
        }
        // return full response so caller can access message/result
        return response;
    },

    /**
     * Update witness name (inline edit).
     * Backend: PATCH /witnesses/name/{witness_id}
     * Body: { witness_name }
     * Returns: { id, witness_name }
     */
    updateWitnessName: async (witnessId, witness_name) => {
        const response = await galloInstance(`/witnesses/name/${witnessId}`, {
            method: 'PATCH',
            body: JSON.stringify({ witness_name }),
        });
        if (response && response.success === false) {
            const message = response?.message || 'Failed to update witness name';
            throw new Error(message);
        }
        return response?.result ?? response;
    },

    /**
     * Save witness (template + times) and upsert videos in one request.
     * Backend: POST /witnesses/save-all (multipart/form-data)
     * - payload: JSON string (form field)
     * - files: 0..N UploadFile (form files)
     */
    saveAllWitnessAndVideos: async ({ payload, files = [] }) => {
        const formData = new FormData();
        formData.append('payload', JSON.stringify(payload));
        for (const f of files) {
            if (f) formData.append('files', f, f.name);
        }

        const response = await galloInstance('/witnesses/save-all', {
            method: 'POST',
            body: formData,
            // Ensure we NEVER force application/json for this request (multipart boundary must be set by browser)
            headers: { 'Content-Type': undefined },
        });

        if (response && response.success === false) {
            const message = response?.message || 'Failed to save witness/videos';
            throw new Error(message);
        }
        return response?.result ?? response;
    },
};