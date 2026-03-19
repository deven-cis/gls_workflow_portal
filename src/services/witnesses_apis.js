import { galloInstance } from './galloInstance';
import { downloadFile, extractFileExtension } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/config';
import { endpoints } from '@/constants/endpoints';
export const witnessesAPI = {
    getWitness: async (witnessId) => {
        const response = await galloInstance(endpoints.witnesses.get(witnessId));
        // Backend returns: { status_code, message, success, result }
        return response?.result ?? response;
    },
    getJobWitnesses: async (jobId) => {
        // Backend: GET /witnesses/list/{job_no}
        const response = await galloInstance(endpoints.witnesses.listByJob(jobId));
        console.log('API: Witnesses response:', response);
        // Backend returns: { status_code, message, success, result: [] }
        return response?.result || [];
    },

    createJObWitness: async (witnessData) => {
        console.log('Creating witness with data:', witnessData);
        const response = await galloInstance(endpoints.witnesses.createName(), {
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
        const response = await galloInstance(endpoints.witnesses.addToCase(caseId), {
            method: 'POST',
            body: JSON.stringify({ case_id: caseId, witness_id: witnessId }),
        });
        return response;
    },
    deleteWitness: async (witnessId) => {
        const response = await galloInstance(endpoints.witnesses.delete(witnessId), {
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
        const response = await galloInstance(endpoints.witnesses.updateName(witnessId), {
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

        const response = await galloInstance(endpoints.witnesses.saveAll(), {
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

    initWitnessVideoUpload: async ({ fileName, fileSize, contentType, totalChunks }) => {
        const response = await galloInstance(endpoints.witnesses.uploadInit(), {
            method: 'POST',
            body: JSON.stringify({
                file_name: fileName,
                file_size: fileSize,
                content_type: contentType,
                total_chunks: totalChunks,
            }),
        });

        if (response && response.success === false) {
            throw new Error(response?.message || 'Failed to initialize video upload');
        }
        return response?.result ?? response;
    },

    uploadWitnessVideoChunk: async ({ uploadId, chunkNumber, totalChunks, chunk, fileName }) => {
        const formData = new FormData();
        formData.append('upload_id', uploadId);
        formData.append('chunk_number', String(chunkNumber));
        formData.append('total_chunks', String(totalChunks));
        formData.append('file', chunk, fileName);

        const response = await galloInstance(endpoints.witnesses.uploadChunk(), {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': undefined },
        });

        if (response && response.success === false) {
            throw new Error(response?.message || 'Failed to upload video chunk');
        }
        return response?.result ?? response;
    },

    completeWitnessVideoUpload: async ({ uploadId }) => {
        const response = await galloInstance(endpoints.witnesses.uploadComplete(), {
            method: 'POST',
            body: JSON.stringify({ upload_id: uploadId }),
        });

        if (response && response.success === false) {
            throw new Error(response?.message || 'Failed to complete video upload');
        }
        return response?.result ?? response;
    },

    uploadVideoInChunks: async (file, { onProgress } = {}) => {
        const chunkSize = 50 * 1024 * 1024;
        const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));

        const init = await witnessesAPI.initWitnessVideoUpload({
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type,
            totalChunks,
        });

        const uploadId = init?.upload_id;
        if (!uploadId) {
            throw new Error('Upload ID was not returned by the server');
        }

        for (let chunkNumber = 0; chunkNumber < totalChunks; chunkNumber += 1) {
            const start = chunkNumber * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);

            await witnessesAPI.uploadWitnessVideoChunk({
                uploadId,
                chunkNumber,
                totalChunks,
                chunk,
                fileName: file.name,
            });

            const progress = Math.round(((chunkNumber + 1) / totalChunks) * 100);
            if (typeof onProgress === 'function') {
                onProgress(progress);
            }
        }

        return witnessesAPI.completeWitnessVideoUpload({ uploadId });
    },

    /**
     * Download complete merged video for a specific witness
     * Backend endpoint: GET /witnesses/{job_no}/download_witnesses_complete_video?witness_id={witness_id}&download_all=true
     * Returns FileResponse (merged video file)
     * @param {number} jobNo - Job number
     * @param {number} witnessId - Witness ID
     * @param {string} [witnessName] - Optional witness name for filename
     */
    downloadWitnessesCompleteVideo: async (jobNo, witnessId, witnessName = null) => {
        const downloadUrl = `${API_BASE_URL}${endpoints.witnesses.downloadCompleteVideo(
            jobNo,
            witnessId
        )}`;
        // Generate dynamic filename: if witness name provided, use it; otherwise use job number and witness ID
        const sanitizedName = witnessName 
            ? witnessName.replace(/[^a-zA-Z0-9_-]/g, '_').trim()
            : `job_${jobNo}_witness_${witnessId}`;
        // Extract dynamic extension from URL or use mp4 as default
        const ext = extractFileExtension('', downloadUrl, 'mp4');
        const defaultFileName = `${sanitizedName}_complete_video.${ext}`;
        return downloadFile(downloadUrl, defaultFileName);
    },
};
