import { galloInstance } from './galloInstance';
import { endpoints } from '@/constants/endpoints';
export const witnessesAPI = {
    _normalizeUploadErrorMessage: (message) => {
        const normalizedMessage = String(message || '').trim();
        if (!normalizedMessage) {
            return 'Failed to upload video';
        }

        if (/ENOSPC|no space left on device|Failed to flush logs to file/i.test(normalizedMessage)) {
            return 'Server storage is full. Video upload cannot continue right now. Please try again later or contact the administrator.';
        }

        return normalizedMessage;
    },

    _triggerDirectDownload: (downloadUrl, fileName) => {
        if (typeof window === 'undefined') return false;
        const link = document.createElement('a');
        link.href = downloadUrl;
        if (fileName) {
            link.setAttribute('download', fileName);
        }
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return true;
    },

    _throwIfAborted: (response) => {
        const error = response?.error;
        const message = response?.message || error?.message || '';
        if (error?.name === 'AbortError' || /aborted/i.test(message)) {
            const abortError = new Error(message || 'Request aborted');
            abortError.name = 'AbortError';
            throw abortError;
        }
    },

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
            throw new Error(witnessesAPI._normalizeUploadErrorMessage(response?.message || 'Failed to initialize video upload'));
        }
        return response?.result ?? response;
    },

    uploadWitnessVideoChunk: async ({ uploadId, chunkNumber, totalChunks, chunk, fileName, signal }) => {
        const formData = new FormData();
        formData.append('upload_id', uploadId);
        formData.append('chunk_number', String(chunkNumber));
        formData.append('total_chunks', String(totalChunks));
        formData.append('file', chunk, fileName);

        const response = await galloInstance(endpoints.witnesses.uploadChunk(), {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': undefined },
            signal,
        });

        if (response && response.success === false) {
            witnessesAPI._throwIfAborted(response);
            throw new Error(witnessesAPI._normalizeUploadErrorMessage(response?.message || 'Failed to upload video chunk'));
        }
        return response?.result ?? response;
    },

    completeWitnessVideoUpload: async ({ uploadId }) => {
        const response = await galloInstance(endpoints.witnesses.uploadComplete(), {
            method: 'POST',
            body: JSON.stringify({ upload_id: uploadId }),
        });

        if (response && response.success === false) {
            throw new Error(witnessesAPI._normalizeUploadErrorMessage(response?.message || 'Failed to complete video upload'));
        }
        return response?.result ?? response;
    },

    getMultipartPartUploadUrl: async ({ uploadId, partNumber }) => {
        const response = await galloInstance(endpoints.witnesses.uploadMultipartPartUrl(), {
            method: 'POST',
            body: JSON.stringify({
                upload_id: uploadId,
                part_number: partNumber,
            }),
        });

        if (response && response.success === false) {
            throw new Error(witnessesAPI._normalizeUploadErrorMessage(response?.message || 'Failed to prepare video upload part'));
        }
        return response?.result ?? response;
    },

    completeMultipartVideoUpload: async ({ uploadId, parts, durationSeconds = null }) => {
        const response = await galloInstance(endpoints.witnesses.uploadComplete(), {
            method: 'POST',
            body: JSON.stringify({ upload_id: uploadId, parts, duration_seconds: durationSeconds }),
        });

        if (response && response.success === false) {
            throw new Error(witnessesAPI._normalizeUploadErrorMessage(response?.message || 'Failed to complete video upload'));
        }
        return response?.result ?? response;
    },

    pauseWitnessVideoUpload: async ({ uploadId }) => {
        if (!uploadId) return null;
        const response = await galloInstance(endpoints.witnesses.uploadPause(), {
            method: 'POST',
            body: JSON.stringify({ upload_id: uploadId }),
        });

        if (response && response.success === false) {
            throw new Error(response?.message || 'Failed to pause video upload');
        }
        return response?.result ?? response;
    },

    resumeWitnessVideoUpload: async ({ uploadId }) => {
        if (!uploadId) return null;
        const response = await galloInstance(endpoints.witnesses.uploadResume(), {
            method: 'POST',
            body: JSON.stringify({ upload_id: uploadId }),
        });

        if (response && response.success === false) {
            throw new Error(response?.message || 'Failed to resume video upload');
        }
        return response?.result ?? response;
    },

    cancelWitnessVideoUpload: async ({ uploadId }) => {
        if (!uploadId) return null;
        const response = await galloInstance(endpoints.witnesses.uploadCancel(), {
            method: 'POST',
            body: JSON.stringify({ upload_id: uploadId }),
        });

        if (response && response.success === false) {
            throw new Error(response?.message || 'Failed to cancel video upload');
        }
        return response?.result ?? response;
    },

    uploadVideoDirectToS3Multipart: async (file, { uploadId, totalChunks, startChunk = 0, uploadedParts = [], durationSeconds = null, onProgress, onChunkUploaded, signal } = {}) => {
        const chunkSize = 50 * 1024 * 1024;
        const parts = [...uploadedParts];

        for (let chunkNumber = startChunk; chunkNumber < totalChunks; chunkNumber += 1) {
            const start = chunkNumber * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);
            const partNumber = chunkNumber + 1;
            const partUrl = await witnessesAPI.getMultipartPartUploadUrl({ uploadId, partNumber });

            const uploadResponse = await fetch(partUrl.upload_url, {
                method: 'PUT',
                body: chunk,
                signal,
            });

            if (!uploadResponse.ok) {
                throw new Error(`Failed to upload video part ${partNumber}`);
            }

            const etag = uploadResponse.headers.get('ETag') || uploadResponse.headers.get('etag');
            if (!etag) {
                throw new Error('S3 upload part completed, but ETag was not returned. Please check S3 CORS ExposeHeaders for ETag.');
            }

            const partResult = { part_number: partNumber, etag };
            parts.push(partResult);

            if (typeof onChunkUploaded === 'function') {
                onChunkUploaded({
                    upload_id: uploadId,
                    received_chunks: chunkNumber + 1,
                    total_chunks: totalChunks,
                    upload_strategy: 's3_multipart',
                    uploaded_parts: [...parts],
                });
            }

            if (typeof onProgress === 'function') {
                onProgress(Math.round(((chunkNumber + 1) / totalChunks) * 100));
            }
        }

        return witnessesAPI.completeMultipartVideoUpload({ uploadId, parts, durationSeconds });
    },

    uploadVideoInChunks: async (file, { onProgress, onInitialized, onChunkUploaded, signal, uploadId: existingUploadId = null, startChunk = 0, totalChunks: providedTotalChunks = null, uploadStrategy = null, uploadedParts = [], durationSeconds = null } = {}) => {
        const chunkSize = 50 * 1024 * 1024;
        const totalChunks = providedTotalChunks ?? Math.max(1, Math.ceil(file.size / chunkSize));

        let uploadId = existingUploadId;
        let strategy = uploadStrategy;
        if (!uploadId) {
            const init = await witnessesAPI.initWitnessVideoUpload({
                fileName: file.name,
                fileSize: file.size,
                contentType: file.type,
                totalChunks,
            });
            uploadId = init?.upload_id;
            strategy = init?.upload_strategy ?? strategy;
            if (typeof onInitialized === 'function') {
                onInitialized(uploadId, init);
            }
        }

        if (!uploadId) {
            throw new Error('Upload ID was not returned by the server');
        }
        if (existingUploadId && typeof onInitialized === 'function') {
            onInitialized(uploadId);
        }

        if (strategy === 's3_multipart') {
            return witnessesAPI.uploadVideoDirectToS3Multipart(file, {
                uploadId,
                totalChunks,
                startChunk,
                uploadedParts,
                durationSeconds,
                onProgress,
                onChunkUploaded,
                signal,
            });
        }

        for (let chunkNumber = startChunk; chunkNumber < totalChunks; chunkNumber += 1) {
            const start = chunkNumber * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);

            const chunkResult = await witnessesAPI.uploadWitnessVideoChunk({
                uploadId,
                chunkNumber,
                totalChunks,
                chunk,
                fileName: file.name,
                signal,
            });

            if (typeof onChunkUploaded === 'function') {
                onChunkUploaded(chunkResult);
            }

            const receivedChunks = chunkResult?.received_chunks ?? (chunkNumber + 1);
            const total = chunkResult?.total_chunks ?? totalChunks;
            const progress = Math.round((receivedChunks / total) * 100);
            if (typeof onProgress === 'function') {
                onProgress(progress);
            }
        }

        return witnessesAPI.completeWitnessVideoUpload({ uploadId });
    },

    requestWitnessCompleteVideoMerge: async (witnessId) => {
        const response = await galloInstance(endpoints.witnesses.requestCompleteVideoMerge(witnessId), {
            method: 'POST',
        });
        if (response && response.success === false) {
            throw new Error(response?.message || 'Failed to start complete video generation');
        }
        return response?.result ?? response;
    },

    getWitnessCompleteVideoStatus: async (witnessId) => {
        const response = await galloInstance(endpoints.witnesses.completeVideoStatus(witnessId));
        if (response && response.success === false) {
            throw new Error(response?.message || 'Failed to get complete video status');
        }
        return response?.result ?? response;
    },

    getWitnessCompleteVideoDownloadLink: async (witnessId) => {
        const response = await galloInstance(endpoints.witnesses.completeVideoDownloadLink(witnessId));
        if (response && response.success === false) {
            throw new Error(response?.message || 'Failed to get complete video download link');
        }
        return response?.result ?? response;
    },

    downloadWitnessesCompleteVideo: async (witnessId, witnessName = null) => {
        const data = await witnessesAPI.getWitnessCompleteVideoDownloadLink(witnessId);
        const directUrl = data?.download_url;
        const directName = data?.file_name || witnessName || `witness_${witnessId}_complete_video.mp4`;
        if (!directUrl) {
            throw new Error('Download URL not available for complete witness video');
        }
        return witnessesAPI._triggerDirectDownload(directUrl, directName);
    },
};
