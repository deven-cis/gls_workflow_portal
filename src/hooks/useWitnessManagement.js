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
            const { API_BASE_URL } = await import('@/lib/config');
            const videoUrl = filePath.startsWith('http') ? filePath : `${API_BASE_URL}/${filePath}`;
            
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
            // Video upload trash icon: Only remove the video file, NOT the entire record
            // This should UPDATE the record to set file_name and file_path to null
            // Keep the backendId so backend can UPDATE the existing record (not delete it)
            setWitnessRecords((prev) => {
                const records = prev[witnessId] || [];
                const record = records.find((r) => r.id === recordId);
                const backendId = record?.backendId;
                const originalVideo = record?.video; // Store original video for restore
                
                // IMPORTANT: Do NOT mark for deletion here
                // Just clear the video file - backend will UPDATE the record (set file_name/file_path to null)
                // Keep backendId so backend knows which record to update
                
                // Clear the video file and store original for restore
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
            const deletedIds = new Set(deletedWitnessVideoIds[witnessId] || []);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/5ea65233-445c-4c1f-bbb6-e6b13c7b0dec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useWitnessManagement.js:492',message:'handleSaveWitness: Starting payload construction',data:{witnessId,recordsCount:records?.length,deletedIds:Array.from(deletedIds)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            const videos = (records || [])
                .filter((r) => {
                    // Filter out records marked for deletion (entire record deletion)
                    if (r._markedForDeletion) return false;
                    // Filter out records that are in deletedWitnessVideoIds (entire record deletion)
                    // These will be handled by the deletes array
                    if (r.backendId && deletedIds.has(r.backendId)) return false;
                    return true;
                })
                .map((r, idx) => {
                const item = {
                    id: r?.backendId ?? r?.videoId ?? r?.id, // if backend id exists, use it; otherwise backend may treat as new
                    start_time: r?.startTime ?? '',
                    end_time: r?.endTime ?? '',
                };

                // Detect if video was explicitly removed by user (trash icon clicked)
                // Video is removed if: video is null AND we have _originalVideo (stored when trash was clicked)
                const videoRemoved = !r?.video && r?._originalVideo && r?.backendId;
                
                // Only include file_index if user selected a NEW file to upload
                const f = r?.video?.file;
                if (f) {
                    // New file to upload
                    item.file_index = files.length;
                    files.push(f);
                } else if (videoRemoved) {
                    // Video was explicitly removed by user (trash icon) - signal backend to clear file
                    // Backend should check: if file_index is None/null and record exists, clear file_name and file_path
                    item.file_index = null; // Explicitly set to null to signal clearing
                } else {
                    // No file_index means: update existing record without changing file
                    // This is for records that have video from backend (filePath) but no new file to upload
                    delete item.file_index;
                }

                // If this is a purely frontend-generated id, don't send it as "id"
                // (backend expects DB id for updates/deletes; omit to create new)
                if (!r?.backendId && !r?.videoId) {
                    delete item.id;
                }
                
                // With replace_videos: true, we MUST include all records we want to keep
                // But we need to be careful not to accidentally clear files
                const hasVideo = !!(r?.video?.file || r?.video?.name || r?.video?.filePath);
                const hasTimes = !!(String(item.start_time || '').trim() && String(item.end_time || '').trim());
                const hasFileIndex = typeof item.file_index === 'number';
                const hasBackendId = !!item.id;
                const fileIndexIsNull = item.file_index === null; // Explicitly set to null (video removed)
                const hasExistingVideoFromBackend = !!(r?.video?.filePath || r?.video?.name) && !r?.video?.file;
                
                // Include record if:
                // 1. Has new file to upload
                // 2. Video was explicitly removed (file_index: null)
                // 3. Is a new record with times
                // 4. Has backendId (existing record) - MUST include to prevent replace_videos from archiving it
                //    BUT: Only set file_index to null if video was explicitly removed
                //    For existing videos from backend, don't set file_index at all (preserve file)
                const finalItem = { ...item };
                if (hasFileIndex || fileIndexIsNull || !hasBackendId) {
                    // Has changes or is new record
                    return finalItem;
                } else if (hasBackendId) {
                    // Existing record - include it to prevent replace_videos from archiving
                    // But make sure file_index is not set (not null, just not present)
                    // This tells backend: update times but don't touch the file
                    if (finalItem.file_index === null) {
                        // This shouldn't happen here, but just in case
                        delete finalItem.file_index;
                    }
                    return finalItem;
                }
                // Skip truly empty records
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
                    // Backend returns witness_videos (serialization alias) from WitnessSchema
                    const vids = raw.witness_videos ?? raw.witness_vid ?? raw.videos ?? [];
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
                            
                            // If matched, preserve _originalVideo and _originalBackendId
                            if (existing && (existing._originalVideo || existing._originalBackendId)) {
                                return {
                                    ...pv,
                                    _originalVideo: existing._originalVideo,
                                    _originalBackendId: existing._originalBackendId,
                                };
                            }
                            
                            // Return the processed video as-is (new video or unmatched)
                            return pv;
                        });
                        
                        // Preserve order: use mergedVideos from backend, but maintain existing order where possible
                        // The backend returns videos in a consistent order, so we use that
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

