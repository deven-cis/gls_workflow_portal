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

    // Seed witnesses from page data
    useEffect(() => {
        if (!Array.isArray(witnessesData)) return;
        const mapped = witnessesData
            .map((w) => ({
                id: w.id ?? w.witness_id ?? w.uuid ?? Date.now() + Math.random(),
                name: w.name ?? w.witness_name ?? w.full_name ?? 'Unnamed Witness',
            }))
            .filter((w) => w.id != null);
        setWitnesses(mapped);
        setWitnessRecords((prev) => {
            const next = { ...prev };
            for (const raw of witnessesData) {
                const wid = raw.id ?? raw.witness_id ?? raw.uuid;
                if (wid == null) continue;
                const vids = raw.witness_vid ?? raw.witness_videos ?? raw.videos ?? [];
                if (Array.isArray(vids) && vids.length) {
                    next[wid] = vids.map((v, idx) => {
                        const start = (v.start_time ?? v.startTime ?? '').toString();
                        const end = (v.end_time ?? v.endTime ?? '').toString();
                        const startTime = start ? start.slice(0, 5) : '';
                        const endTime = end ? end.slice(0, 5) : '';
                        const fileName = v.file_name ?? v.fileName ?? null;
                        const filePath = v.file_path ?? v.filePath ?? null;
                        return {
                            id: v.id ?? `vid-${wid}-${idx}`,
                            backendId: v.id,
                            startTime,
                            endTime,
                            video: fileName
                                ? {
                                      name: fileName,
                                      filePath,
                                      uploadedAt: v.created_at ?? v.createdAt ?? null,
                                      size: v.file_size ?? v.fileSize ?? null,
                                  }
                                : null,
                        };
                    });
                } else {
                    // Ensure key exists for UI even when no videos yet
                    if (!next[wid]) next[wid] = [];
                }
            }
            // Also ensure mapped witnesses exist (in case raw list had missing ids)
            for (const w of mapped) {
                if (!next[w.id]) next[w.id] = [];
            }
            return next;
        });
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
            const newId = res?.witness_id ?? res?.id ?? res?.witnessId ?? Date.now();
            const apiName = res?.witness_name ?? res?.name ?? name;

            setWitnesses((prev) => [...prev, { id: newId, name: apiName }]);
            setWitnessRecords((prev) => ({
                ...prev,
                [newId]: [],
            }));

            // Try to get template from API response
            setWitnessTemplates((prev) => {
                const apiTemplate = res?.template;
                if (apiTemplate && (apiTemplate.readOnText || apiTemplate.readOffText)) {
                    return {
                        ...prev,
                        [newId]: {
                            readOnText: apiTemplate.readOnText ?? '',
                            readOnTime: apiTemplate.readOnTime ?? '',
                            readOffText: apiTemplate.readOffText ?? '',
                            readOffTime: apiTemplate.readOffTime ?? '',
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

                // Fallback: use empty template (original behavior)
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
            // If this was an existing backend video, mark it for deletion,
            // clear the backendId so it won't be "kept" in replace_videos mode,
            // and clear the file so user can re-upload a replacement.
            setWitnessRecords((prev) => {
                const records = prev[witnessId] || [];
                const record = records.find((r) => r.id === recordId);
                const backendId = record?.backendId;
                if (backendId) {
                    // Mark for deletion
                    setDeletedWitnessVideoIds((prevDel) => ({
                        ...prevDel,
                        [witnessId]: Array.from(new Set([...(prevDel[witnessId] || []), backendId])),
                    }));
                    return {
                        ...prev,
                        [witnessId]: records.map((r) =>
                            r.id === recordId ? { ...r, backendId: undefined, videoId: undefined, video: null } : r
                        ),
                    };
                }
                return prev;
            });
            handleUpdateRecord(witnessId, recordId, 'video', null);
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

            const witness = witnesses.find((w) => w.id === witnessId);
            const witnessName = witness?.name || '';

            const files = [];
            const videos = (records || [])
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
                // For new videos, backend supports creating rows even without a file
                // (file can be uploaded later), so keep the item as long as it has times.
                const hasTimes = !!(String(item.start_time || '').trim() && String(item.end_time || '').trim());
                const hasFileIndex = typeof item.file_index === 'number';
                if (!item.id && !hasFileIndex && !hasTimes) return null;
                return item;
            })
                .filter(Boolean);
            const deletes = (deletedWitnessVideoIds[witnessId] || []).map((id) => ({
                id,
                delete: true,
            }));

            const payload = {
                job_no: jobId,
                witness_id: witnessId,
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
            setDeletedWitnessVideoIds((prev) => {
                const next = { ...prev };
                delete next[witnessId];
                return next;
            });

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
                    setWitnessRecords((prev) => {
                        const next = { ...prev };
                        next[witnessId] = Array.isArray(vids)
                            ? vids.map((v, idx) => {
                                  const start = (v.start_time ?? v.startTime ?? '').toString();
                                  const end = (v.end_time ?? v.endTime ?? '').toString();
                                  const startTime = start ? start.slice(0, 5) : '';
                                  const endTime = end ? end.slice(0, 5) : '';
                                  const fileName = v.file_name ?? v.fileName ?? null;
                                  const filePath = v.file_path ?? v.filePath ?? null;
                                  return {
                                      id: v.id ?? `vid-${witnessId}-${idx}`,
                                      backendId: v.id,
                                      startTime,
                                      endTime,
                                      video: fileName
                                          ? {
                                                name: fileName,
                                                filePath,
                                                uploadedAt: v.created_at ?? v.createdAt ?? null,
                                                size: v.file_size ?? v.fileSize ?? null,
                                            }
                                          : null,
                                  };
                              })
                            : [];
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
    }, [witnesses, deletedWitnessVideoIds, searchParams, params, toast]);

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
    };
};

