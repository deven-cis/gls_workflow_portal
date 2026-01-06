import { useState, useEffect, useCallback } from 'react';
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

    // Witness state
    const [witnesses, setWitnesses] = useState([]);
    const [addingWitness, setAddingWitness] = useState(false);
    const [newWitnessName, setNewWitnessName] = useState('');
    const [expandedWitness, setExpandedWitness] = useState(null);
    const [witnessRecords, setWitnessRecords] = useState({});
    const [witnessTemplates, setWitnessTemplates] = useState({});
    const [deletedWitnessVideoIds, setDeletedWitnessVideoIds] = useState({}); // witnessId -> number[]

    // Helper function to fetch video metadata (size and duration) from file path
    const fetchVideoMetadata = useCallback(async (filePath, fileName) => {
        if (!filePath || typeof window === 'undefined') return { size: null, durationSeconds: null };
        
        try {
            // Construct full URL if filePath is relative
            const baseUrl = 'http://127.0.0.1:8000'; // Match GALLo_URL
            const videoUrl = filePath.startsWith('http') ? filePath : `${baseUrl}/${filePath}`;
            
            // Fetch video file with authentication headers (if available)
            const token = localStorage.getItem('access_token');
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            // Fetch video to get both size and duration
            const videoResponse = await fetch(videoUrl, { headers });
            if (!videoResponse.ok) {
                return { size: null, durationSeconds: null };
            }
            
            const contentLength = videoResponse.headers.get('content-length');
            const size = contentLength ? parseInt(contentLength, 10) : null;
            
            const blob = await videoResponse.blob();
            const url = URL.createObjectURL(blob);
            
            return new Promise((resolve) => {
                const videoEl = document.createElement('video');
                videoEl.preload = 'metadata';
                videoEl.onloadedmetadata = () => {
                    const durationSeconds = Number.isFinite(videoEl.duration) ? videoEl.duration : null;
                    URL.revokeObjectURL(url);
                    resolve({ size, durationSeconds });
                };
                videoEl.onerror = () => {
                    URL.revokeObjectURL(url);
                    resolve({ size, durationSeconds: null });
                };
                videoEl.src = url;
            });
        } catch (error) {
            console.warn('Failed to fetch video metadata:', error);
            return { size: null, durationSeconds: null };
        }
    }, []);

    // Seed witnesses from page data
    useEffect(() => {
        if (!Array.isArray(witnessesData)) return;
        const mapped = witnessesData
            .map((w) => ({
                id: w.id ?? w.witness_id ?? w.uuid ?? Date.now() + Math.random(),
                name: w.name ?? w.witness_name ?? w.full_name ?? 'Unnamed Witness',
            }))
            .filter((w) => w.id != null)
            // Sort by ID descending (newest/highest ID first) so recently added witnesses appear at top
            .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
        setWitnesses(mapped);
        // Process videos and fetch metadata asynchronously
        const processVideos = async () => {
            const next = {};
            for (const raw of witnessesData) {
                const wid = raw.id ?? raw.witness_id ?? raw.uuid;
                if (wid == null) continue;
                const vids = raw.witness_vid ?? raw.witness_videos ?? raw.videos ?? [];
                if (Array.isArray(vids) && vids.length) {
                    const processedVideos = await Promise.all(
                        vids.map(async (v, idx) => {
                            const start = (v.start_time ?? v.startTime ?? '').toString();
                            const end = (v.end_time ?? v.endTime ?? '').toString();
                            const startTime = start ? start.slice(0, 5) : '';
                            const endTime = end ? end.slice(0, 5) : '';
                            const fileName = v.file_name ?? v.fileName ?? null;
                            const filePath = v.file_path ?? v.filePath ?? null;
                            
                            // Fetch video metadata (size and duration) from file path
                            let size = null;
                            let durationSeconds = null;
                            if (filePath && fileName) {
                                const metadata = await fetchVideoMetadata(filePath, fileName);
                                size = metadata.size;
                                durationSeconds = metadata.durationSeconds;
                            }
                            
                            return {
                                id: v.id ?? `vid-${wid}-${idx}`,
                                backendId: v.id,
                                startTime,
                                endTime,
                                video: fileName
                                    ? {
                                          name: fileName,
                                          filePath,
                                          uploadedAt: v.entered_at ?? v.created_at ?? v.createdAt ?? null,
                                          size,
                                          durationSeconds,
                                      }
                                    : null,
                            };
                        })
                    );
                    next[wid] = processedVideos;
                } else {
                    // Ensure key exists for UI even when no videos yet
                    if (!next[wid]) next[wid] = [];
                }
            }
            // Also ensure mapped witnesses exist (in case raw list had missing ids)
            for (const w of mapped) {
                if (!next[w.id]) next[w.id] = [];
            }
            
            // Update state with processed videos
            setWitnessRecords((prev) => ({ ...prev, ...next }));
        };
        
        processVideos();
        setWitnessTemplates((prev) => {
            const next = { ...prev };
            // Build a name->id map in case API items lack an id field
            const byName = new Map(
                mapped
                    .filter((m) => m?.name)
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
    }, [witnessesData]);

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
        setWitnessRecords((prev) => {
            const current = prev[witnessId] || [];
            if (current.length >= 5) {
                toast.error('You can add maximum 5 videos (no more than 5).');
                return prev;
            }
            return {
                ...prev,
                [witnessId]: [
                    ...current,
                    { id: Date.now(), startTime: '', endTime: '', video: null }
                ]
            };
        });
    }, [toast]);

    // Handle update record
    const handleUpdateRecord = useCallback((witnessId, recordId, field, value) => {
        setWitnessRecords((prev) => ({
            ...prev,
            [witnessId]: (prev[witnessId] || []).map((r) =>
                r.id === recordId ? { ...r, [field]: value } : r
            )
        }));
    }, []);

    // Handle upload video
    const handleUploadVideo = useCallback(async (witnessId, recordId, file) => {
        // allow removing selected video
        if (!file) {
            // File trash should NOT remove the whole Part section.
            // When deleting just the video file (not the whole record), we need to:
            // 1. Keep the backendId so backend can UPDATE existing record (not create new)
            // 2. Store original video for potential restore on cancel
            // 3. Clear the video file so user can re-upload a replacement
            setWitnessRecords((prev) => {
                const records = prev[witnessId] || [];
                const record = records.find((r) => r.id === recordId);
                const backendId = record?.backendId;
                const originalVideo = record?.video; // Store original video for restore
                // IMPORTANT: Keep backendId so backend can UPDATE existing record instead of creating new one
                // Only clear the video file, not the backendId
                return {
                    ...prev,
                    [witnessId]: records.map((r) =>
                        r.id === recordId ? { ...r, _originalBackendId: backendId, _originalVideo: originalVideo, video: null } : r
                    ),
                };
            });
            return;
        }

        const fileName = (file.name || '').toLowerCase();
        const mime = (file.type || '').toLowerCase();
        const isMp4 = mime === 'video/mp4' || fileName.endsWith('.mp4');
        const isMpeg = mime === 'video/mpeg' || fileName.endsWith('.mpeg') || fileName.endsWith('.mpg');
        if (!isMp4 && !isMpeg) {
            toast.error('Only MPEG or MP4 formats are allowed.');
            return;
        }

        const baseVideo = {
            file, // keep reference for /witnesses/save-all upload
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString(),
        };

        // Set basic metadata immediately
        handleUpdateRecord(witnessId, recordId, 'video', baseVideo);

        // Try to read duration from the file (for the "00:12:21" pill)
        try {
            if (typeof window === 'undefined') return;
            const url = URL.createObjectURL(file);
            const videoEl = document.createElement('video');
            videoEl.preload = 'metadata';
            videoEl.onloadedmetadata = () => {
                const seconds = Number.isFinite(videoEl.duration) ? videoEl.duration : null;
                URL.revokeObjectURL(url);
                if (seconds && seconds > 0) {
                    handleUpdateRecord(witnessId, recordId, 'video', { ...baseVideo, durationSeconds: seconds });
                }
            };
            videoEl.onerror = () => {
                URL.revokeObjectURL(url);
            };
            videoEl.src = url;
        } catch (e) {
            // ignore duration extraction failures
        }
    }, [handleUpdateRecord, toast]);

    // Handle delete record
    const handleDeleteRecord = useCallback((witnessId, recordId) => {
        // If record exists in DB, mark it for deletion in save-all payload
        setWitnessRecords((prev) => {
            const record = (prev[witnessId] || []).find((r) => r.id === recordId);
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
    }, []);

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

            const files = [];
            const videos = (records || [])
                .filter((r) => !r._markedForDeletion) // Filter out records marked for deletion
                .map((r) => {
                const item = {
                    id: r?.backendId ?? r?.videoId ?? r?.id, // if backend id exists, use it; otherwise backend may treat as new
                    start_time: r?.startTime ?? '',
                    end_time: r?.endTime ?? '',
                };

                // Only include file_index if user selected a file
                const f = r?.video?.file;
                if (f) {
                    item.file_index = files.length;
                    files.push(f);
                } else {
                    delete item.file_index;
                }

                // If this is a purely frontend-generated id, don't send it as "id"
                // (backend expects DB id for updates/deletes; omit to create new)
                if (!r?.backendId && !r?.videoId) {
                    delete item.id;
                }
                // Filter out empty records: no video, no times, no backend ID
                const hasVideo = !!(r?.video?.file || r?.video?.name || r?.video?.filePath);
                const hasTimes = !!(String(item.start_time || '').trim() && String(item.end_time || '').trim());
                const hasFileIndex = typeof item.file_index === 'number';
                const hasBackendId = !!item.id;
                // Skip empty records (no video, no times, no backend ID)
                if (!hasBackendId && !hasFileIndex && !hasTimes && !hasVideo) {
                    return null;
                }
                return item;
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
            console.log('witness save files', files);
            const saved = await witnessesAPI.saveAllWitnessAndVideos({ payload, files });
            
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
            try {
                const list = await witnessesAPI.getJobWitnesses(jobId);
                const raw = (Array.isArray(list) ? list : []).find((w) => (w.id ?? w.witness_id) === witnessId);
                if (raw) {
                    const vids = raw.witness_vid ?? raw.witness_videos ?? raw.videos ?? [];
                    // Process videos and fetch metadata
                    const processedVideos = await Promise.all(
                        (Array.isArray(vids) ? vids : []).map(async (v, idx) => {
                            const start = (v.start_time ?? v.startTime ?? '').toString();
                            const end = (v.end_time ?? v.endTime ?? '').toString();
                            const startTime = start ? start.slice(0, 5) : '';
                            const endTime = end ? end.slice(0, 5) : '';
                            const fileName = v.file_name ?? v.fileName ?? null;
                            const filePath = v.file_path ?? v.filePath ?? null;
                            
                            // Fetch video metadata (size and duration) from file path
                            let size = null;
                            let durationSeconds = null;
                            if (filePath && fileName) {
                                const metadata = await fetchVideoMetadata(filePath, fileName);
                                size = metadata.size;
                                durationSeconds = metadata.durationSeconds;
                            }
                            
                            return {
                                id: v.id ?? `vid-${witnessId}-${idx}`,
                                backendId: v.id,
                                startTime,
                                endTime,
                                video: fileName
                                    ? {
                                          name: fileName,
                                          filePath,
                                          uploadedAt: v.entered_at ?? v.created_at ?? v.createdAt ?? null,
                                          size,
                                          durationSeconds,
                                      }
                                    : null,
                            };
                        })
                    );
                    
                    setWitnessRecords((prev) => {
                        const next = { ...prev };
                        const existingRecords = prev[witnessId] || [];
                        // Preserve _originalVideo and _originalBackendId from existing records when merging
                        const existingMap = new Map();
                        const deletedRecordsWithOriginalVideo = [];
                        existingRecords.forEach((r) => {
                            const key = r.backendId ?? r.id;
                            if (key) {
                                existingMap.set(key, r);
                            }
                        });
                        // Merge processed videos with existing records, preserving _originalVideo for videos that still exist
                        // (videos that were deleted and saved are not in processedVideos, so their _originalVideo is lost - this is correct)
                        const mergedVideos = processedVideos.map((pv) => {
                            const existing = existingMap.get(pv.backendId);
                            if (existing && (existing._originalVideo || existing._originalBackendId)) {
                                return {
                                    ...pv,
                                    _originalVideo: existing._originalVideo,
                                    _originalBackendId: existing._originalBackendId,
                                };
                            }
                            return pv;
                        });
                        next[witnessId] = mergedVideos;
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
        }
    }, [witnesses, deletedWitnessVideoIds, searchParams, params, toast, fetchVideoMetadata]);

    return {
        // State
        witnesses,
        addingWitness,
        newWitnessName,
        expandedWitness,
        witnessRecords,
        witnessTemplates,
        deletedWitnessVideoIds,
        
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
        handleUpdateTemplate,
        handleSaveWitness,
        
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

