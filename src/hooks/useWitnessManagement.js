import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { witnessesAPI } from '@/services/witnesses_apis';

/**
 * Custom hook to manage all witness-related state and operations
 * @param {Array} witnessesData - Initial witnesses data from backend
 * @param {Function} toast - Toast notification function
 * @returns {Object} Witness management state and handlers
 */
export const useWitnessManagement = (witnessesData, toast) => {
    const params = useParams();
    const searchParams = useSearchParams();
    const uploadControllersRef = useRef(new Map());

    const pauseUploadSession = useCallback((uploadId) => {
        if (!uploadId) return Promise.resolve(null);
        return witnessesAPI.pauseWitnessVideoUpload({ uploadId }).catch((error) => {
            console.warn('Failed to pause witness video upload on backend:', error);
            throw error;
        });
    }, []);

    const resumeUploadSession = useCallback((uploadId) => {
        if (!uploadId) return Promise.resolve(null);
        return witnessesAPI.resumeWitnessVideoUpload({ uploadId }).catch((error) => {
            console.warn('Failed to resume witness video upload on backend:', error);
            throw error;
        });
    }, []);

    const cancelUploadSession = useCallback((uploadId) => {
        if (!uploadId) return;
        witnessesAPI.cancelWitnessVideoUpload({ uploadId }).catch((error) => {
            console.warn('Failed to cancel witness video upload on backend:', error);
        });
    }, []);

    const extractLocalVideoDuration = useCallback(async (file) => {
        if (typeof window === 'undefined' || !file) return null;

        return new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const videoEl = document.createElement('video');
            videoEl.preload = 'metadata';
            let resolved = false;

            const cleanup = (value = null) => {
                if (resolved) return;
                resolved = true;
                clearTimeout(timeout);
                videoEl.src = '';
                URL.revokeObjectURL(url);
                resolve(value);
            };

            const timeout = setTimeout(() => cleanup(null), 2000);

            videoEl.onloadedmetadata = () => {
                const seconds = Number.isFinite(videoEl.duration) ? videoEl.duration : null;
                cleanup(seconds && seconds > 0 ? seconds : null);
            };

            videoEl.onerror = () => cleanup(null);
            videoEl.src = url;
        });
    }, []);

    // Witness state
    const [witnesses, setWitnesses] = useState([]);
    const [addingWitness, setAddingWitness] = useState(false);
    const [newWitnessName, setNewWitnessName] = useState('');
    const [expandedWitness, setExpandedWitness] = useState(null);
    const [witnessRecords, setWitnessRecords] = useState({});
    const [witnessTemplates, setWitnessTemplates] = useState({});
    const [deletedWitnessVideoIds, setDeletedWitnessVideoIds] = useState({}); // witnessId -> number[]
    const [savingWitnessIds, setSavingWitnessIds] = useState(new Set()); // Set of witness IDs currently being saved
    const [loadingWitnessIds, setLoadingWitnessIds] = useState(new Set()); // Set of witness IDs currently loading videos
    const [isLoadingWitnessData, setIsLoadingWitnessData] = useState(true); // Loading state for initial witness data fetch

    const mapWitnessVideoRecord = useCallback((video, witnessId, index) => {
        const start = (video.start_time ?? video.startTime ?? '').toString();
        const end = (video.end_time ?? video.endTime ?? '').toString();
        const fileName = video.file_name ?? video.fileName ?? null;
        const filePath = video.file_path ?? video.filePath ?? null;

    return {
            id: video.id ?? `vid-${witnessId}-${index}`,
            backendId: video.id,
            startTime: start ? start.slice(0, 5) : '',
            endTime: end ? end.slice(0, 5) : '',
            video: fileName
                ? {
                      name: fileName,
                      filePath,
                      uploadedAt: video.entered_at ?? video.created_at ?? video.createdAt ?? null,
                      size: video.file_size ?? video.size ?? null,
                      durationSeconds: video.duration_seconds ?? video.durationSeconds ?? null,
                      timecode: video.timecode ?? null,
                      uploadStatus: 'uploaded',
                      uploadProgress: 100,
                      uploadToken: null,
                  }
                : null,
        };
    }, []);

    const mapWitnessSummary = useCallback((raw) => {
        const mergedVideoPath = raw?.merged_video_path ?? raw?.mergedVideoPath ?? null;
        const mergeRequestedAt = raw?.merge_requested_at ?? raw?.mergeRequestedAt ?? null;
        let mergeStatus = raw?.merge_status ?? raw?.mergeStatus ?? null;
        if ((!mergeStatus || mergeStatus === 'pending') && !mergeRequestedAt && !mergedVideoPath) {
            mergeStatus = 'not_requested';
        }
        return {
            id: raw?.id ?? raw?.witness_id ?? raw?.uuid ?? Date.now() + Math.random(),
            name: raw?.name ?? raw?.witness_name ?? raw?.full_name ?? 'Unnamed Witness',
            mergedVideoPath,
            mergedVideoName: raw?.merged_video_name ?? raw?.mergedVideoName ?? null,
            mergedVideoSize: raw?.merged_video_size ?? raw?.mergedVideoSize ?? null,
            mergedDuration: raw?.merged_duration ?? raw?.mergedDuration ?? null,
            mergeStatus: mergeStatus || 'not_requested',
            mergeError: raw?.merge_error ?? raw?.mergeError ?? null,
            mergeRequestedAt,
            mergeCompletedAt: raw?.merge_completed_at ?? raw?.mergeCompletedAt ?? null,
        };
    }, []);

    const applyWitnessMergeState = useCallback((witnessId, raw) => {
        if (!witnessId || !raw) return;
        const patch = {
            mergedVideoPath: raw?.merged_video_path ?? raw?.mergedVideoPath ?? null,
            mergedVideoName: raw?.merged_video_name ?? raw?.mergedVideoName ?? null,
            mergedVideoSize: raw?.merged_video_size ?? raw?.mergedVideoSize ?? null,
            mergedDuration: raw?.merged_duration ?? raw?.mergedDuration ?? null,
            mergeStatus: raw?.merge_status ?? raw?.mergeStatus ?? 'not_requested',
            mergeError: raw?.merge_error ?? raw?.mergeError ?? null,
            mergeRequestedAt: raw?.merge_requested_at ?? raw?.mergeRequestedAt ?? null,
            mergeCompletedAt: raw?.merge_completed_at ?? raw?.mergeCompletedAt ?? null,
        };
        setWitnesses((prev) => prev.map((w) => (w.id === witnessId ? { ...w, ...patch } : w)));
    }, []);

    // Seed witnesses from page data - maintain stable order across updates
    useEffect(() => {
        if (!Array.isArray(witnessesData)) return;
        
        setWitnesses((prevWitnesses) => {
            const mapped = witnessesData
                .map((w) => mapWitnessSummary(w))
                .filter((w) => w.id != null);
            
            // If this is the first load, sort by ID descending (newest first)
            if (!prevWitnesses || prevWitnesses.length === 0) {
                return mapped.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
            }
            
            // For subsequent updates, maintain existing order
            // Update names for existing witnesses, keep order unchanged
            // Add new witnesses to the top
            const prevIds = new Set(prevWitnesses.map(w => w.id));
            const newWitnesses = mapped.filter(w => !prevIds.has(w.id));
            const updatedExisting = prevWitnesses.map(prev => {
                const updated = mapped.find(m => m.id === prev.id);
                return updated ? { ...prev, ...updated } : prev;
            });
            
            // Return: new witnesses at top, then existing in their current order
            return [...newWitnesses, ...updatedExisting];
        });
        // Initialize loading state with all witness IDs
        const allWitnessIds = witnessesData.map(w => w.id ?? w.witness_id ?? w.uuid).filter(id => id != null);
        setLoadingWitnessIds(new Set(allWitnessIds));
        
        // Build witness records directly from backend metadata.
        const processVideos = async () => {
            const nextRecords = {};
            const loadedWitnessIds = [];

            const witnessProcessingPromises = witnessesData.map(async (raw) => {
                const wid = raw.id ?? raw.witness_id ?? raw.uuid;
                if (wid == null) return;

                try {
                    const vids = raw.witness_vid ?? raw.witness_videos ?? raw.videos ?? [];
                    const processedVideos = Array.isArray(vids)
                        ? vids.map((video, idx) => mapWitnessVideoRecord(video, wid, idx))
                        : [];

                    nextRecords[wid] = processedVideos.sort((a, b) => (a.id || 0) - (b.id || 0));
                } catch (error) {
                    console.error(`Error processing witness ${wid}:`, error);
                    nextRecords[wid] = [];
                } finally {
                    loadedWitnessIds.push(wid);
                }
            });

            await Promise.all(witnessProcessingPromises);

            setWitnessRecords((prev) => ({
                ...prev,
                ...nextRecords,
            }));

            setLoadingWitnessIds((prev) => {
                const newSet = new Set(prev);
                loadedWitnessIds.forEach((wid) => newSet.delete(wid));
                return newSet;
            });
        };
        
        processVideos().then(() => {
            // Data loading complete
            setIsLoadingWitnessData(false);
        });
        setWitnessTemplates((prev) => {
            const next = { ...prev };
            // Build a name->id map in case API items lack an id field
            const byName = new Map(
                witnessesData
                    .map(w => ({
                        id: w.id ?? w.witness_id ?? w.uuid,
                        name: w.name ?? w.witness_name ?? w.full_name,
                    }))
                    .filter((m) => m?.name && m?.id)
                    .map((m) => [(m.name || '').toLowerCase(), m.id])
            );
            for (const raw of witnessesData) {
                let id = raw.id ?? raw.witness_id ?? raw.uuid;
                if (id == null) {
                    const rawName = (raw.witness_name ?? raw.name ?? '').toLowerCase();
                    id = byName.get(rawName);
                }
                if (id == null) continue;
                const template = {
                    readOnText: raw.read_on_text ?? raw.readOnText ?? '',
                    readOnTime: raw.read_on_time ?? raw.readOnTime ?? '',
                    readOffText: raw.read_off_text ?? raw.readOffText ?? '',
                    readOffTime: raw.read_off_time ?? raw.readOffTime ?? '',
                };
                if (template.readOnText || template.readOffText || template.readOnTime || template.readOffTime) {
                    next[id] = template;
                }
            }
            return next;
        });
    }, [witnessesData, mapWitnessSummary, mapWitnessVideoRecord]);

    // Handle add witness
    const handleAddWitness = useCallback(async () => {
        const name = (newWitnessName ?? '').toString().trim();
        if (!name) {
            toast.error('Witness name cannot be empty');
            return;
        }

        try {
            const jobIdParam = searchParams.get('jobId');
            const jobId = Number(jobIdParam ?? params?.id);
            if (!jobId) {
                toast.error('Unable to determine job number for witness creation');
                return;
            }

            const payload = { job_no: jobId, witness_name: name };
            const res = await witnessesAPI.createJObWitness(payload);
            
            // Extract witness ID - backend returns 'id' field in the result
            let newId = res?.witness_id ?? res?.id ?? res?.witnessId;
            
            // WORKAROUND: If ID is missing from response, fetch witness list to get the real ID
            if (!newId) {
                try {
                    const witnessList = await witnessesAPI.getJobWitnesses(jobId);
                    // Find the newly created witness by name (should be the most recent one)
                    const newWitness = Array.isArray(witnessList) 
                        ? witnessList.find(w => (w.witness_name ?? w.name) === name)
                        : null;
                    if (newWitness) {
                        newId = newWitness.id ?? newWitness.witness_id ?? newWitness.witnessId;
                    }
                } catch (fetchError) {
                    console.error('Failed to fetch witness list after creation:', fetchError);
                }
            }
            
            // Ensure ID is a number, not a string or temporary value
            newId = newId ? Number(newId) : null;
            if (!newId || isNaN(newId) || newId <= 0) {
                toast.error('Failed to create witness: Invalid witness ID received from server');
                console.error('Invalid witness ID from API:', res);
                return;
            }
            
            const apiName = res?.witness_name ?? res?.name ?? name;

            // Add new witness at the top of the list (most recently added first)
            setWitnesses((prev) => [{ id: newId, name: apiName }, ...prev]);
            setWitnessRecords((prev) => ({
                ...prev,
                [newId]: [],
            }));

            // Get template from API response (backend generates read_on_text and read_off_text)
            setWitnessTemplates((prev) => {
                // Backend returns read_on_text and read_off_text directly in the response
                // Handle both snake_case (from backend) and camelCase (for consistency)
                const readOnText = res?.read_on_text ?? res?.readOnText ?? '';
                const readOffText = res?.read_off_text ?? res?.readOffText ?? '';
                const readOnTime = res?.read_on_time ?? res?.readOnTime ?? '';
                const readOffTime = res?.read_off_time ?? res?.readOffTime ?? '';

                // If backend provided the template text, use it
                if (readOnText || readOffText) {
                    return {
                        ...prev,
                        [newId]: {
                            readOnText: readOnText,
                            readOnTime: readOnTime,
                            readOffText: readOffText,
                            readOffTime: readOffTime,
                        },
                    };
                }

                // Otherwise, use first existing witness's template as default
                const existingTemplateKeys = Object.keys(prev);
                if (existingTemplateKeys.length > 0) {
                    const firstTemplate = prev[existingTemplateKeys[0]];
                    if (firstTemplate && (firstTemplate.readOnText || firstTemplate.readOffText)) {
                        return {
                            ...prev,
                            [newId]: {
                                readOnText: firstTemplate.readOnText ?? '',
                                readOnTime: firstTemplate.readOnTime ?? '',
                                readOffText: firstTemplate.readOffText ?? '',
                                readOffTime: firstTemplate.readOffTime ?? '',
                            },
                        };
                    }
                }

                // Fallback: use empty template
                return {
                    ...prev,
                    [newId]: prev[newId] ?? {
                        readOnText: '',
                        readOnTime: '',
                        readOffText: '',
                        readOffTime: '',
                    },
                };
            });

            setNewWitnessName('');
            setAddingWitness(false);
            setExpandedWitness(newId);
        } catch (err) {
            console.error('Failed to create witness:', err);
            toast?.error?.(err?.message || 'Failed to create witness');
        }
    }, [newWitnessName, searchParams, params, toast]);

    // Handle rename witness
    const handleRenameWitness = useCallback(async (witnessId, newName) => {
        const name = (newName ?? '').toString().trim();
        if (!name) {
            toast.error('Witness name cannot be empty');
            return false;
        }
        try {
            const res = await witnessesAPI.updateWitnessName(witnessId, name);
            const updatedName = res?.witness_name ?? res?.name ?? name;
            setWitnesses((prev) => prev.map((w) => (w.id === witnessId ? { ...w, name: updatedName } : w)));
            toast.success('Witness name updated successfully');
            return true;
        } catch (err) {
            console.error('Failed to update witness name:', err);
            toast.error(err?.message || 'Failed to update witness name');
            return false;
        }
    }, [toast]);

    // Handle delete witness
    const handleDeleteWitness = useCallback(async (witnessId) => {
        try {
            const res = await witnessesAPI.deleteWitness(witnessId);
            toast.success(res?.message || 'Witness archived successfully');

            setWitnesses((prev) => prev.filter((w) => w.id !== witnessId));
            setWitnessRecords((prev) => {
                const next = { ...prev };
                delete next[witnessId];
                return next;
            });
            setWitnessTemplates((prev) => {
                const next = { ...prev };
                delete next[witnessId];
                return next;
            });
            setDeletedWitnessVideoIds((prev) => {
                const next = { ...prev };
                delete next[witnessId];
                return next;
            });
            setExpandedWitness(null);
        } catch (err) {
            console.error('Failed to archive witness:', err);
            toast.error(err?.message || 'Failed to archive witness');
        }
    }, [toast]);

    // Handle add record
    const handleAddRecord = useCallback((witnessId) => {
        const current = witnessRecords[witnessId] || [];
        if (current.length >= 5) {
            toast.error('You can add maximum 5 videos (no more than 5).');
            return;
        }

        setWitnessRecords((prev) => {
            return {
                ...prev,
                [witnessId]: [
                    ...(prev[witnessId] || []),
                    { id: Date.now(), startTime: '', endTime: '', video: null }
                ]
            };
        });
    }, [toast, witnessRecords]);

    // Handle update record
    const handleUpdateRecord = useCallback((witnessId, recordId, field, value) => {
        setWitnessRecords((prev) => ({
            ...prev,
            [witnessId]: (prev[witnessId] || []).map((r) =>
                r.id === recordId ? { ...r, [field]: value } : r
            ).sort((a, b) => (a.id || 0) - (b.id || 0))
        }));
    }, []);

    const runUploadFlow = useCallback(async ({
        witnessId,
        recordId,
        file,
        uploadId = null,
        startChunk = 0,
        totalChunks = null,
        baseVideo,
        localDuration = null,
    }) => {
        const uploadKey = `${witnessId}:${recordId}`;
        const controller = new AbortController();
        const existingState = uploadControllersRef.current.get(uploadKey) || {};
        uploadControllersRef.current.set(uploadKey, {
            ...existingState,
            controller,
            file,
            uploadId: uploadId ?? existingState.uploadId ?? null,
            uploadStrategy: existingState.uploadStrategy ?? null,
            uploadedParts: existingState.uploadedParts ?? [],
            nextChunkIndex: startChunk,
            totalChunks,
            paused: false,
            pauseRequested: false,
        });

        try {
            const uploaded = await witnessesAPI.uploadVideoInChunks(file, {
                signal: controller.signal,
                uploadId,
                startChunk,
                totalChunks,
                uploadStrategy: existingState.uploadStrategy ?? null,
                uploadedParts: existingState.uploadedParts ?? [],
                durationSeconds: localDuration,
                onInitialized: (initializedUploadId, initResult = null) => {
                    const current = uploadControllersRef.current.get(uploadKey);
                    if (!current) return;
                    uploadControllersRef.current.set(uploadKey, {
                        ...current,
                        uploadId: initializedUploadId,
                        uploadStrategy: initResult?.upload_strategy ?? current.uploadStrategy,
                    });
                },
                onChunkUploaded: (chunkResult) => {
                    const current = uploadControllersRef.current.get(uploadKey);
                    if (!current) return;
                    uploadControllersRef.current.set(uploadKey, {
                        ...current,
                        nextChunkIndex: chunkResult?.received_chunks ?? current.nextChunkIndex,
                        totalChunks: chunkResult?.total_chunks ?? current.totalChunks,
                        uploadStrategy: chunkResult?.upload_strategy ?? current.uploadStrategy,
                        uploadedParts: chunkResult?.uploaded_parts ?? current.uploadedParts ?? [],
                    });
                },
                onProgress: (progress) => {
                    handleUpdateRecord(witnessId, recordId, 'video', {
                        ...baseVideo,
                        uploadStatus: 'uploading',
                        uploadProgress: progress,
                    });
                },
            });

            handleUpdateRecord(witnessId, recordId, 'video', {
                name: uploaded?.file_name ?? file.name,
                filePath: uploaded?.file_path ?? null,
                uploadedAt: new Date().toISOString(),
                size: uploaded?.file_size ?? file.size,
                durationSeconds: uploaded?.duration_seconds ?? localDuration ?? null,
                timecode: uploaded?.timecode ?? null,
                uploadStatus: 'uploaded',
                uploadProgress: 100,
                uploadToken: uploaded?.upload_id ?? null,
            });
            uploadControllersRef.current.delete(uploadKey);
            return uploaded;
        } catch (e) {
            if (e?.name === 'AbortError') {
                const current = uploadControllersRef.current.get(uploadKey);
                if (current?.pauseRequested) {
                    uploadControllersRef.current.set(uploadKey, {
                        ...current,
                        controller: null,
                        paused: true,
                        pauseRequested: false,
                    });
                    return null;
                }
                uploadControllersRef.current.delete(uploadKey);
                return null;
            }
            uploadControllersRef.current.delete(uploadKey);
            throw e;
        }
    }, [handleUpdateRecord]);

    // Handle upload video
    const handleUploadVideo = useCallback(async (witnessId, recordId, file) => {
        // allow removing selected video
        if (!file) {
            const records = witnessRecords[witnessId] || [];
            const record = records.find((r) => r.id === recordId);
            if (record?.video?.uploadStatus === 'uploading' || record?.video?.uploadStatus === 'paused') {
                const uploadKey = `${witnessId}:${recordId}`;
                const uploadState = uploadControllersRef.current.get(uploadKey);
                if (uploadState?.controller) {
                    uploadState.controller.abort();
                }
                cancelUploadSession(uploadState?.uploadId);
                uploadControllersRef.current.delete(uploadKey);
                setWitnessRecords((prev) => ({
                    ...prev,
                    [witnessId]: (prev[witnessId] || []).map((r) =>
                        r.id === recordId ? { ...r, video: null } : r
                    ),
                }));
                return;
            }

            setWitnessRecords((prev) => {
                const backendId = record?.backendId;
                const originalVideo = record?.video;

                return {
                    ...prev,
                    [witnessId]: records.map((r) =>
                        r.id === recordId ? { ...r, _originalBackendId: backendId, _originalVideo: originalVideo, video: null } : r
                    ),
                };
            });
            return;
        }

        const normalizedFileName = (file.name || '').toLowerCase();
        const allowedExtensions = ['.mp4', '.mkv', '.mpeg', '.mpg', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp'];
        const isAllowed = allowedExtensions.some((ext) => normalizedFileName.endsWith(ext));
        if (!isAllowed) {
            toast.error('Unsupported video format selected.');
            return;
        }

        const baseVideo = {
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString(),
            uploadStatus: 'uploading',
            uploadProgress: 0,
        };

        const uploadKey = `${witnessId}:${recordId}`;

        handleUpdateRecord(witnessId, recordId, 'video', baseVideo);

        try {
            const localDuration = await extractLocalVideoDuration(file);
            const previewVideo = localDuration
                ? { ...baseVideo, durationSeconds: localDuration }
                : baseVideo;

            handleUpdateRecord(witnessId, recordId, 'video', previewVideo);

            await runUploadFlow({
                witnessId,
                recordId,
                file,
                baseVideo: previewVideo,
                localDuration,
            });
        } catch (e) {
            if (e?.name === 'AbortError') {
                return;
            }
            console.error('Failed to upload witness video:', e);
            handleUpdateRecord(witnessId, recordId, 'video', {
                ...baseVideo,
                uploadStatus: 'failed',
                uploadProgress: 0,
                uploadError: e?.message || 'Upload failed',
            });
            toast.error(e?.message || 'Failed to upload video');
        }
    }, [cancelUploadSession, extractLocalVideoDuration, handleUpdateRecord, runUploadFlow, toast, witnessRecords]);

    const handlePauseUploadingVideo = useCallback(async (witnessId, recordId) => {
        const uploadKey = `${witnessId}:${recordId}`;
        const uploadState = uploadControllersRef.current.get(uploadKey);
        const record = (witnessRecords[witnessId] || []).find((r) => r.id === recordId);
        if (!record?.video) return false;
        if (record.video.uploadStatus === 'paused') return true;
        if (record.video.uploadStatus !== 'uploading') return false;

        if (uploadState?.controller) {
            uploadControllersRef.current.set(uploadKey, {
                ...uploadState,
                pauseRequested: true,
            });
            uploadState.controller.abort();
        }

        try {
            const pauseResult = uploadState?.uploadId
                ? await pauseUploadSession(uploadState.uploadId)
                : null;

            const isDirectS3Upload = uploadState?.uploadStrategy === 's3_multipart';
            const receivedChunks = isDirectS3Upload
                ? (uploadState?.nextChunkIndex ?? 0)
                : (pauseResult?.received_chunks ?? uploadState?.nextChunkIndex ?? 0);
            const totalChunks = pauseResult?.total_chunks ?? uploadState?.totalChunks ?? Math.max(1, Math.ceil((uploadState?.file?.size || record.video.size || 0) / (50 * 1024 * 1024)));
            const progress = totalChunks > 0 ? Math.round((receivedChunks / totalChunks) * 100) : (record.video.uploadProgress ?? 0);

            if (uploadState) {
                uploadControllersRef.current.set(uploadKey, {
                    ...uploadState,
                    controller: null,
                    paused: true,
                    pauseRequested: false,
                    nextChunkIndex: receivedChunks,
                    totalChunks,
                });
            }

            handleUpdateRecord(witnessId, recordId, 'video', {
                ...record.video,
                uploadStatus: 'paused',
                uploadProgress: progress,
            });
            return true;
        } catch (error) {
            console.error('Failed to pause upload:', error);
            toast.error(error?.message || 'Failed to pause upload');
            if (uploadState) {
                uploadControllersRef.current.set(uploadKey, {
                    ...uploadState,
                    pauseRequested: false,
                });
            }
            return false;
        }
    }, [handleUpdateRecord, pauseUploadSession, toast, witnessRecords]);

    const handleResumeUploadingVideo = useCallback(async (witnessId, recordId) => {
        const uploadKey = `${witnessId}:${recordId}`;
        const uploadState = uploadControllersRef.current.get(uploadKey);
        const record = (witnessRecords[witnessId] || []).find((r) => r.id === recordId);
        if (!record?.video || !uploadState?.file) {
            toast.error('Upload cannot be resumed because the file is no longer available.');
            return false;
        }

        try {
            const resumeResult = uploadState?.uploadId
                ? await resumeUploadSession(uploadState.uploadId)
                : null;
            const isDirectS3Upload = uploadState?.uploadStrategy === 's3_multipart';
            const startChunk = isDirectS3Upload
                ? (uploadState?.nextChunkIndex ?? 0)
                : (resumeResult?.received_chunks ?? uploadState?.nextChunkIndex ?? 0);
            const totalChunks = resumeResult?.total_chunks ?? uploadState?.totalChunks ?? Math.max(1, Math.ceil(uploadState.file.size / (50 * 1024 * 1024)));
            const progress = totalChunks > 0 ? Math.round((startChunk / totalChunks) * 100) : 0;
            const resumedVideo = {
                ...record.video,
                uploadStatus: 'uploading',
                uploadProgress: progress,
            };

            handleUpdateRecord(witnessId, recordId, 'video', resumedVideo);

            await runUploadFlow({
                witnessId,
                recordId,
                file: uploadState.file,
                uploadId: uploadState.uploadId ?? resumeResult?.upload_id ?? null,
                startChunk,
                totalChunks,
                uploadStrategy: uploadState.uploadStrategy ?? resumeResult?.upload_strategy ?? null,
                uploadedParts: uploadState.uploadedParts ?? [],
                durationSeconds: record.video.durationSeconds ?? null,
                baseVideo: resumedVideo,
                localDuration: record.video.durationSeconds ?? null,
            });
            return true;
        } catch (error) {
            console.error('Failed to resume upload:', error);
            handleUpdateRecord(witnessId, recordId, 'video', {
                ...record.video,
                uploadStatus: 'paused',
            });
            toast.error(error?.message || 'Failed to resume upload');
            return false;
        }
    }, [handleUpdateRecord, resumeUploadSession, runUploadFlow, toast, witnessRecords]);

    // Handle delete record
    const handleDeleteRecord = useCallback((witnessId, recordId) => {
        const record = (witnessRecords[witnessId] || []).find((r) => r.id === recordId);
            if (record?.video?.uploadStatus === 'uploading') {
                const uploadKey = `${witnessId}:${recordId}`;
                const uploadState = uploadControllersRef.current.get(uploadKey);
                if (uploadState?.controller) {
                    uploadState.controller.abort();
                    cancelUploadSession(uploadState.uploadId);
                uploadControllersRef.current.delete(uploadKey);
            }
        }

        setWitnessRecords((prev) => {
            const backendId = record?.backendId;
            if (backendId) {
                setDeletedWitnessVideoIds((prevDel) => ({
                    ...prevDel,
                    [witnessId]: Array.from(new Set([...(prevDel[witnessId] || []), backendId])),
                }));
            }
            return {
                ...prev,
                [witnessId]: (prev[witnessId] || []).filter((r) => r.id !== recordId),
            };
        });
    }, [cancelUploadSession, toast, witnessRecords]);

    // Handle update template
    const handleUpdateTemplate = useCallback((witnessId, field, value) => {
        setWitnessTemplates((prev) => ({
            ...prev,
            [witnessId]: {
                ...prev[witnessId],
                [field]: value
            }
        }));
    }, []);

    // Handle save witness
    const handleSaveWitness = useCallback(async (witnessId, { template, records } = {}) => {
        // Set loading state for this witness
        setSavingWitnessIds((prev) => new Set([...prev, witnessId]));
        
        try {
            const jobIdParam = searchParams.get('jobId');
            const jobId = Number(jobIdParam ?? params?.id);
            if (!jobId) {
                toast.error('Unable to determine job number for witness save');
                return;
            }

            // Ensure witnessId is a valid number (not a temporary Date.now() value)
            const numericWitnessId = Number(witnessId);
            if (!numericWitnessId || isNaN(numericWitnessId) || numericWitnessId <= 0 || numericWitnessId > 9999999999999) {
                // If witnessId looks like Date.now() (very large number), it's a temporary ID
                toast.error('Witness ID is invalid. Please refresh the page and try again.');
                console.error('Invalid witness ID:', witnessId);
                return;
            }

            const witness = witnesses.find((w) => w.id === witnessId);
            const witnessName = witness?.name || '';
            
            if (!witness) {
                toast.error('Witness not found. Please refresh the page and try again.');
                console.error('Witness not found in state:', witnessId, witnesses);
                return;
            }

            const deletedIds = new Set(deletedWitnessVideoIds[witnessId] || []);
            const activeRecords = records || [];
            const pendingUploadRecord = activeRecords.find((r) =>
                r?.video?.uploadStatus === 'uploading' || r?.video?.uploadStatus === 'paused'
            );
            if (pendingUploadRecord) {
                toast.error('Please wait for all video uploads to complete or resume paused uploads before saving.');
                return;
            }

            const failedRecord = activeRecords.find((r) => r?.video?.uploadStatus === 'failed');
            if (failedRecord) {
                toast.error('One or more video uploads failed. Please re-upload before saving.');
                return;
            }

            const videos = activeRecords
                .filter((r) => {
                    // Filter out records marked for deletion (entire record deletion)
                    if (r._markedForDeletion) return false;
                    // Filter out records that are in deletedWitnessVideoIds (entire record deletion)
                    // These will be handled by the deletes array
                    if (r.backendId && deletedIds.has(r.backendId)) return false;
                    return true;
                })
                .map((r) => {
                const item = {
                    id: r?.backendId ?? r?.videoId ?? r?.id, // if backend id exists, use it; otherwise backend may treat as new
                    start_time: r?.startTime ?? '',
                    end_time: r?.endTime ?? '',
                };

                // Detect if video was explicitly removed by user (trash icon clicked)
                // Video is removed if: video is null AND we have _originalVideo (stored when trash was clicked)
                const videoRemoved = !r?.video && r?._originalVideo && r?.backendId;
                
                const uploadToken = r?.video?.uploadToken;
                if (uploadToken) {
                    item.upload_token = uploadToken;
                } else if (videoRemoved) {
                    item.file_index = null;
                } else {
                    delete item.file_index;
                }

                // If this is a purely frontend-generated id, don't send it as "id"
                // (backend expects DB id for updates/deletes; omit to create new)
                if (!r?.backendId && !r?.videoId) {
                    delete item.id;
                }
                
                // With replace_videos: true, we MUST include all records we want to keep
                // But we need to be careful not to accidentally clear files
                const hasUploadToken = !!item.upload_token;
                const hasBackendId = !!item.id;
                const fileIndexIsNull = item.file_index === null; // Explicitly set to null (video removed)
                
                const finalItem = { ...item };
                if (hasUploadToken || fileIndexIsNull || !hasBackendId) {
                    return finalItem;
                } else if (hasBackendId) {
                    if (finalItem.file_index === null) {
                        delete finalItem.file_index;
                    }
                    return finalItem;
                }
                return null;
            })
                .filter(Boolean);
            const deletes = (deletedWitnessVideoIds[witnessId] || []).map((id) => ({
                id,
                delete: true,
            }));

            const payload = {
                job_no: jobId,
                witness_id: numericWitnessId, // Use validated numeric ID
                witness_name: witnessName,
                read_on_text: template?.readOnText ?? '',
                read_off_text: template?.readOffText ?? '',
                read_on_time: template?.readOnTime ?? '',
                read_off_time: template?.readOffTime ?? '',
                // Backend "sync mode": archive any existing videos not present in this payload
                // (supports empty list -> delete all)
                replace_videos: true,
                videos: [...deletes, ...videos],
            };
            console.log('witness save payload', payload);
            const saved = await witnessesAPI.saveAllWitnessAndVideos({ payload, files: [] });
            
            toast.success('Witness and videos saved successfully');
            // Clear deleted video IDs after successful save (deletion is committed)
            setDeletedWitnessVideoIds((prev) => {
                const next = { ...prev };
                delete next[witnessId];
                return next;
            });
            // Note: _originalVideo is preserved during refresh (see below) so cancel can restore
            // before the next save. After the next save, it will be cleared.

            // Keep local UI in sync with what backend returns (best-effort)
            if (saved?.witness_name) {
                setWitnesses((prev) => prev.map((w) => (w.id === witnessId ? { ...w, name: saved.witness_name } : w)));
            }
            applyWitnessMergeState(witnessId, saved);
            setWitnessTemplates((prev) => ({
                ...prev,
                [witnessId]: {
                    readOnText: saved?.read_on_text ?? prev?.[witnessId]?.readOnText ?? '',
                    readOnTime: saved?.read_on_time ?? prev?.[witnessId]?.readOnTime ?? '',
                    readOffText: saved?.read_off_text ?? prev?.[witnessId]?.readOffText ?? '',
                    readOffTime: saved?.read_off_time ?? prev?.[witnessId]?.readOffTime ?? '',
                },
            }));

            // Important: refresh witness videos from backend so newly-created videos get real IDs
            // (prevents duplicate creates on subsequent saves).
            // First, try to use the response from save-all (which already contains updated witness data)
            // Fall back to separate API call if needed
            try {
                // Try to use the saved response directly (backend returns updated witness with videos)
                let raw = saved;
                // If saved response doesn't have the witness data we need, fetch from API
                if (!raw || (!raw.witness_videos && !raw.witness_vid && !raw.videos)) {
                    const list = await witnessesAPI.getJobWitnesses(jobId);
                    raw = (Array.isArray(list) ? list : []).find((w) => (w.id ?? w.witness_id) === witnessId);
                }
                
                if (raw) {
                    applyWitnessMergeState(witnessId, raw);
                    // Backend returns witness_videos (serialization alias) from WitnessSchema
                    const vids = raw.witness_videos ?? raw.witness_vid ?? raw.videos ?? [];
                    const processedVideos = (Array.isArray(vids) ? vids : []).map((v, idx) => {
                        return mapWitnessVideoRecord(v, witnessId, idx);
                    });
                    
                    setWitnessRecords((prev) => {
                        const next = { ...prev };
                        const existingRecords = prev[witnessId] || [];
                        
                        // Create maps for matching:
                        // 1. By backendId (for existing videos that were updated)
                        const existingByBackendId = new Map();
                        // 2. By startTime + endTime (for new videos that were just created)
                        const existingByTimeKey = new Map();
                        // 3. Track which existing records have been matched
                        const matchedExistingIds = new Set();
                        
                        // Helper to normalize time format for matching (HH:MM:SS -> HH:MM, or keep HH:MM)
                        const normalizeTimeForMatching = (time) => {
                            if (!time) return '';
                            const str = String(time).trim();
                            // If format is HH:MM:SS, extract HH:MM; if HH:MM, keep as is
                            return str.length >= 5 ? str.slice(0, 5) : str;
                        };
                        
                        existingRecords.forEach((r) => {
                            // Map by backendId for existing videos
                            if (r.backendId) {
                                existingByBackendId.set(r.backendId, r);
                            }
                            // Map by time combination for new videos (without backendId)
                            if (!r.backendId && r.startTime && r.endTime) {
                                const startNorm = normalizeTimeForMatching(r.startTime);
                                const endNorm = normalizeTimeForMatching(r.endTime);
                                if (startNorm && endNorm) {
                                    const timeKey = `${startNorm}|${endNorm}`;
                                    existingByTimeKey.set(timeKey, r);
                                }
                            }
                        });
                        
                        // Match processed videos from backend to existing records
                        // This preserves order and matches new videos correctly
                        const mergedVideos = processedVideos.map((pv) => {
                            let existing = null;
                            
                            // First, try to match by backendId (for existing videos)
                            if (pv.backendId) {
                                existing = existingByBackendId.get(pv.backendId);
                                if (existing) {
                                    matchedExistingIds.add(existing.id);
                                }
                            }
                            
                            // If not matched by backendId, try matching by time (for new videos)
                            if (!existing && pv.startTime && pv.endTime) {
                                const startNorm = normalizeTimeForMatching(pv.startTime);
                                const endNorm = normalizeTimeForMatching(pv.endTime);
                                if (startNorm && endNorm) {
                                    const timeKey = `${startNorm}|${endNorm}`;
                                    existing = existingByTimeKey.get(timeKey);
                                    if (existing && !matchedExistingIds.has(existing.id)) {
                                        matchedExistingIds.add(existing.id);
                                    } else {
                                        existing = null; // Already matched or doesn't match
                                    }
                                }
                            }
                            
                            // If matched, preserve locally extracted duration and size
                            if (existing) {
                                const result = {
                                    ...pv,
                                    _originalVideo: existing._originalVideo,
                                    _originalBackendId: existing._originalBackendId,
                                };
                                // Preserve locally extracted duration and size if backend doesn't have them
                                if (existing.video && pv.video) {
                                    if (!pv.video.durationSeconds && existing.video.durationSeconds) {
                                        pv.video.durationSeconds = existing.video.durationSeconds;
                                    }
                                    if (!pv.video.size && existing.video.size) {
                                        pv.video.size = existing.video.size;
                                    }
                                }
                                result.video = pv.video;
                                return result;
                            }
                            
                            // Return the processed video as-is (new video or unmatched)
                            return pv;
                        });
                        
                        const sortedVideos = mergedVideos.sort((a, b) => (a.id || 0) - (b.id || 0));
                        
                        // Preserve order: use sorted videos
                        next[witnessId] = sortedVideos;
                        return next;
                    });
                }
            } catch (e) {
                // If refresh fails, keep local state; next page refresh will reconcile.
                console.warn('Failed to refresh witness list after save:', e);
            }
        } catch (err) {
            console.error('Failed to save witness/videos:', err);
            toast.error(err?.message || 'Failed to save witness/videos');
        } finally {
            // Clear loading state for this witness
            setSavingWitnessIds((prev) => {
                const next = new Set(prev);
                next.delete(witnessId);
                return next;
            });
        }
    }, [witnesses, deletedWitnessVideoIds, searchParams, params, toast, mapWitnessVideoRecord, applyWitnessMergeState]);

    const handleRequestCompleteVideoMerge = useCallback(async (witnessId) => {
        const result = await witnessesAPI.requestWitnessCompleteVideoMerge(witnessId);
        applyWitnessMergeState(witnessId, result);
        return result;
    }, [applyWitnessMergeState]);

    const handleRefreshCompleteVideoStatus = useCallback(async (witnessId) => {
        const result = await witnessesAPI.getWitnessCompleteVideoStatus(witnessId);
        applyWitnessMergeState(witnessId, result);
        return result;
    }, [applyWitnessMergeState]);

    const handleDownloadWitnessCompleteVideo = useCallback(async (witnessId, witnessName) => {
        return witnessesAPI.downloadWitnessesCompleteVideo(witnessId, witnessName);
    }, []);

    return {
        // State
        witnesses,
        addingWitness,
        newWitnessName,
        expandedWitness,
        witnessRecords,
        witnessTemplates,
        deletedWitnessVideoIds,
        savingWitnessIds,
        loadingWitnessIds,
        isLoadingWitnessData,
        
        // Setters
        setAddingWitness,
        setNewWitnessName,
        setExpandedWitness,
        
        // Handlers
        handleAddWitness,
        handleRenameWitness,
        handleDeleteWitness,
        handleAddRecord,
        handleUpdateRecord,
        handleUploadVideo,
        handleDeleteRecord,
        handlePauseUploadingVideo,
        handleResumeUploadingVideo,
        handleUpdateTemplate,
        handleSaveWitness,
        handleRequestCompleteVideoMerge,
        handleRefreshCompleteVideoStatus,
        handleDownloadWitnessCompleteVideo,
        
        // Cancel handler to restore deleted videos
        handleCancelWitness: useCallback((witnessId) => {
            // Restore videos that were deleted (have _originalVideo)
            setWitnessRecords((prev) => {
                const records = prev[witnessId] || [];
                return {
                    ...prev,
                    [witnessId]: records.map((r) => {
                        if (r._originalVideo) {
                            const { _originalVideo, _originalBackendId, ...rest } = r;
                            // Restore both video and backendId
                            return { ...rest, video: _originalVideo, backendId: _originalBackendId ?? rest.backendId };
                        }
                        return r;
                    }),
                };
            });
            // Clear deleted video IDs for this witness
            setDeletedWitnessVideoIds((prev) => {
                const next = { ...prev };
                if (next[witnessId]) {
                    delete next[witnessId];
                }
                return next;
            });
        }, []),
    };
};
