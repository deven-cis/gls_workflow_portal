import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { equipmentTimeAPI } from '@/services/equipment_time_apis';

/**
 * Custom hook to manage all equipment & time-related state and operations
 * @param {Function} toast - Toast notification function
 * @param {boolean} isUpcomingTask - Whether the task is an upcoming task (prevents editing)
 * @param {Function} onCancelCallback - Optional callback when equipment is cancelled (for collapsing section)
 * @returns {Object} Equipment management state and handlers
 */
export const useEquipmentManagement = (toast, isUpcomingTask = false, onCancelCallback = null) => {
    const params = useParams();
    const searchParams = useSearchParams();
    const selectedJobId = searchParams.get('jobId');

    // Equipment state
    const [equipmentInfo, setEquipmentInfo] = useState({
        laptopUsed: false,
        pipUsed: false,
        exhibitTech: false,
        parkingCost: '',
        timeAfterFive: '',
        documents: [],
        cameraCapture: null
    });
    const [editingEquipment, setEditingEquipment] = useState(false);
    const [pendingEquipmentChanges, setPendingEquipmentChanges] = useState(null);
    const [equipmentHasBeenSaved, setEquipmentHasBeenSaved] = useState(false);
    const [equipmentTimeId, setEquipmentTimeId] = useState(null);

    // Helper function to create document metadata
    const createDocumentMeta = useCallback((file) => {
        if (!file) return null;
        return {
            id: `${file.name}-${Date.now()}`,
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString()
        };
    }, []);

    // Fetch equipment data from backend
    const fetchEquipmentData = useCallback(async () => {
        if (!selectedJobId) return;
        
        try {
            // Get equipment time by job_no (backend endpoint: GET /equipment-time/get/{job_no})
            const equipmentData = await equipmentTimeAPI.getJobEquipmentTime(selectedJobId);
            
            if (equipmentData) {
                // Map backend response to frontend format
                setEquipmentInfo({
                    laptopUsed: equipmentData.laptop_used ?? false,
                    pipUsed: equipmentData.pip_used ?? false,
                    exhibitTech: equipmentData.exhibit_tech ?? false,
                    parkingCost: equipmentData.parking_cost ? String(equipmentData.parking_cost) : '',
                    timeAfterFive: equipmentData.time_after ?? '',
                    cameraCapture: equipmentData.camera_captured_file_path ? {
                        filePath: equipmentData.camera_captured_file_path,
                        fileName: equipmentData.camera_captured_file_name || 'Equipment Image'
                    } : null,
                    documents: await Promise.all((equipmentData.documents || []).map(async (doc) => {
                        let fileSize = doc.size || 0;
                        // If size is 0 or missing and filePath exists, fetch it from server
                        if ((!fileSize || fileSize === 0) && doc.file_path) {
                            const { fetchDocumentFileSize } = await import('@/lib/utils');
                            const fetchedSize = await fetchDocumentFileSize(doc.file_path);
                            if (fetchedSize) {
                                fileSize = fetchedSize;
                            }
                        }
                        return {
                            id: doc.id ? `doc-${doc.id}` : `doc-${Date.now()}-${Math.random()}`,
                            name: doc.file_name || doc.name || 'Unknown',
                            size: fileSize,
                            type: doc.file_name?.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
                            uploadedAt: doc.entered_at || doc.created_at || doc.uploaded_at || new Date().toISOString(),
                            backendId: doc.id,
                            filePath: doc.file_path
                        };
                    }))
                });
                setEquipmentTimeId(equipmentData.id);
                setEquipmentHasBeenSaved(true);
                setEditingEquipment(false); // Show Edit/Delete buttons when equipment exists
            } else {
                // No equipment data exists - show empty form with Save/Cancel buttons
                const emptyEquipment = {
                    laptopUsed: false,
                    pipUsed: false,
                    exhibitTech: false,
                    parkingCost: '',
                    timeAfterFive: '',
                    documents: [],
                    cameraCapture: null
                };
                setEquipmentInfo(emptyEquipment);
                setEquipmentTimeId(null);
                setEquipmentHasBeenSaved(false);
                setEditingEquipment(true); // Show Save/Cancel buttons when no equipment exists
                setPendingEquipmentChanges(emptyEquipment);
            }
        } catch (err) {
            // Only log actual errors (not 404s/500s, which are handled in the API)
            if (err?.status !== 404 && err?.status !== 500) {
                console.error('Unexpected error fetching equipment time data:', err);
            }
            // Show empty form with Save/Cancel buttons on error
            const emptyEquipment = {
                laptopUsed: false,
                pipUsed: false,
                exhibitTech: false,
                parkingCost: '',
                timeAfterFive: '',
                documents: [],
                cameraCapture: null
            };
            setEquipmentInfo(emptyEquipment);
            setEquipmentTimeId(null);
            setEquipmentHasBeenSaved(false);
            setEditingEquipment(true);
            setPendingEquipmentChanges(emptyEquipment);
        }
    }, [selectedJobId]);

    // Handle equipment checkbox toggle
    const handleEquipmentCheckbox = useCallback((field) => {
        if (!editingEquipment) return;
        setEquipmentInfo((prev) => ({ ...prev, [field]: !prev[field] }));
    }, [editingEquipment]);

    // Handle equipment input change
    const handleEquipmentInputChange = useCallback((field, value) => {
        if (!editingEquipment) return;
        
        // For parking cost, only allow numbers and decimal point
        if (field === 'parkingCost') {
            // Remove any non-numeric characters except decimal point
            const numericValue = value.replace(/[^0-9.]/g, '');
            // Ensure only one decimal point
            const parts = numericValue.split('.');
            const sanitizedValue = parts.length > 2 
                ? parts[0] + '.' + parts.slice(1).join('') 
                : numericValue;
            setEquipmentInfo((prev) => ({ ...prev, [field]: sanitizedValue }));
        } else {
            setEquipmentInfo((prev) => ({ ...prev, [field]: value }));
        }
    }, [editingEquipment]);

    // Handle equipment document upload
    const handleEquipmentUpload = useCallback((file) => {
        if (!editingEquipment) return;
        const document = createDocumentMeta(file);
        if (!document) return;
        // Add file object to document so it can be sent to backend
        const documentWithFile = { ...document, file };
        setEquipmentInfo((prev) => ({ ...prev, documents: [...prev.documents, documentWithFile] }));
    }, [editingEquipment, createDocumentMeta]);

    // Handle equipment document remove
    const handleEquipmentDocumentRemove = useCallback((documentId) => {
        if (!editingEquipment) return;
        setEquipmentInfo((prev) => ({
            ...prev,
            documents: prev.documents.filter((doc) => doc.id !== documentId)
        }));
    }, [editingEquipment]);

    // Handle equipment camera capture
    const handleEquipmentCameraCapture = useCallback((file) => {
        if (!editingEquipment) return;
        setEquipmentInfo((prev) => ({
            ...prev,
            cameraCapture: {
                file,
                fileName: file.name || 'Equipment Image'
            }
        }));
    }, [editingEquipment]);

    // Handle remove equipment camera capture
    const handleRemoveEquipmentCameraCapture = useCallback(() => {
        if (!editingEquipment) return;
        setEquipmentInfo((prev) => ({
            ...prev,
            cameraCapture: null
        }));
    }, [editingEquipment]);

    // Handle edit equipment
    const handleEditEquipment = useCallback(() => {
        // Prevent editing for upcoming tasks
        if (isUpcomingTask) {
            return;
        }
        setEditingEquipment(true);
        // Store current state as pending changes for cancel
        setPendingEquipmentChanges({
            ...equipmentInfo,
            cameraCapture: equipmentInfo.cameraCapture ? {
                ...equipmentInfo.cameraCapture
            } : null,
            documents: equipmentInfo.documents.map(doc => ({ ...doc }))
        });
    }, [isUpcomingTask, equipmentInfo]);

    // Handle save equipment
    const handleSaveEquipment = useCallback(async () => {
        // Validate parking cost if provided
        if (equipmentInfo.parkingCost && equipmentInfo.parkingCost.trim()) {
            const parkingValue = parseFloat(equipmentInfo.parkingCost);
            if (isNaN(parkingValue) || parkingValue < 0) {
                toast.error('Parking cost must be a valid positive number');
                return;
            }
        }

        // Validate time after 5PM if provided
        if (equipmentInfo.timeAfterFive && equipmentInfo.timeAfterFive.trim()) {
            // Time format validation (HH:MM or HH:MM:SS)
            // HTML5 time input can return either format depending on browser
            let trimmedTime = equipmentInfo.timeAfterFive.trim();
            
            // Normalize: remove seconds if present (convert HH:MM:SS to HH:MM)
            if (trimmedTime.includes(':') && trimmedTime.split(':').length === 3) {
                const parts = trimmedTime.split(':');
                trimmedTime = `${parts[0]}:${parts[1]}`;
            }
            
            // Accept both HH:MM and HH:MM:SS formats for validation
            const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
            if (!timePattern.test(trimmedTime)) {
                toast.error('Time After 5PM must be in valid format (HH:MM)');
                return;
            }
        }

        // Determine which documents were removed (compare with original)
        // Use backendId for documents that came from backend, id for new documents
        const originalDocIds = new Set((pendingEquipmentChanges?.documents || []).map(doc => doc.backendId || doc.id));
        const currentDocIds = new Set((equipmentInfo.documents || []).map(doc => doc.backendId || doc.id));
        const documentsToRemove = Array.from(originalDocIds)
            .filter(id => !currentDocIds.has(id))
            .filter(id => {
                // Only include documents that have a backendId (were saved to backend)
                // New documents without backendId don't need to be removed from backend
                const originalDoc = (pendingEquipmentChanges?.documents || []).find(doc => (doc.backendId || doc.id) === id);
                return originalDoc?.backendId != null;
            })
            .map(id => {
                // Get the backendId for removal
                const originalDoc = (pendingEquipmentChanges?.documents || []).find(doc => (doc.backendId || doc.id) === id);
                return originalDoc?.backendId || id;
            });

        // Add documentsToRemove to equipmentInfo for update API
        const equipmentData = { ...equipmentInfo };
        if (equipmentTimeId && documentsToRemove.length > 0) {
            equipmentData.documentsToRemove = documentsToRemove;
        }

        // Normalize timeAfterFive: remove seconds if present (convert HH:MM:SS to HH:MM)
        if (equipmentData.timeAfterFive && equipmentData.timeAfterFive.trim()) {
            let normalizedTime = equipmentData.timeAfterFive.trim();
            if (normalizedTime.includes(':') && normalizedTime.split(':').length === 3) {
                const parts = normalizedTime.split(':');
                normalizedTime = `${parts[0]}:${parts[1]}`;
            }
            equipmentData.timeAfterFive = normalizedTime;
        }

        // Extract camera file and determine if it should be removed
        const cameraFile = equipmentInfo.cameraCapture?.file || null;
        const shouldRemoveCameraFile = equipmentTimeId && !equipmentInfo.cameraCapture && !cameraFile;

        // Persist equipment time to backend
        try {
            const jobIdParam = searchParams.get('jobId');
            const jobNo = Number(jobIdParam ?? params?.id);
            if (!jobNo || Number.isNaN(jobNo)) {
                toast.error('Unable to determine job number for equipment time');
                return;
            }

            let response;
            if (equipmentTimeId) {
                // Update existing equipment time - only send changed fields
                response = await equipmentTimeAPI.updateEquipmentTime(
                    equipmentTimeId,
                    equipmentData,
                    pendingEquipmentChanges,
                    jobNo,
                    cameraFile,
                    shouldRemoveCameraFile
                );
                toast.success('Equipment time updated successfully');
            } else {
                // Create new equipment time
                response = await equipmentTimeAPI.createEquipmentTime(jobNo, equipmentData, cameraFile);
                // Store equipment time ID from response
                if (response?.result?.id) {
                    setEquipmentTimeId(response.result.id);
                }
                toast.success('Equipment time saved successfully');
            }

            // Fetch updated equipment data to get documents with backend IDs
            try {
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait for backend processing
                const updatedData = await equipmentTimeAPI.getJobEquipmentTime(jobNo);
                
                if (updatedData) {
                    // Map documents from backend
                    const mappedDocuments = await Promise.all((updatedData.documents || []).map(async (doc) => {
                        const docId = doc.id ? `doc-${doc.id}` : `doc-${Date.now()}-${Math.random()}`;
                        let fileSize = doc.size || 0;
                        
                        if ((!fileSize || fileSize === 0) && doc.file_path) {
                            try {
                                const { fetchDocumentFileSize } = await import('@/lib/utils');
                                const fetchedSize = await fetchDocumentFileSize(doc.file_path);
                                if (fetchedSize) fileSize = fetchedSize;
                            } catch (err) {
                                console.warn(`Failed to fetch file size for doc ${doc.id}:`, err);
                            }
                        }
                        
                        return {
                            id: docId,
                            name: doc.file_name || doc.name || 'Unknown',
                            size: fileSize,
                            type: doc.file_name?.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
                            uploadedAt: doc.entered_at || doc.created_at || doc.uploaded_at || new Date().toISOString(),
                            backendId: doc.id,
                            filePath: doc.file_path
                        };
                    }));
                    
                    setEquipmentInfo({
                        laptopUsed: updatedData.laptop_used ?? false,
                        pipUsed: updatedData.pip_used ?? false,
                        exhibitTech: updatedData.exhibit_tech ?? false,
                        parkingCost: updatedData.parking_cost ? String(updatedData.parking_cost) : '',
                        timeAfterFive: updatedData.time_after ?? '',
                        cameraCapture: updatedData.camera_captured_file_path ? {
                            filePath: updatedData.camera_captured_file_path,
                            fileName: updatedData.camera_captured_file_name || 'Equipment Camera Image'
                        } : null,
                        documents: mappedDocuments
                    });
                    
                    if (updatedData.id) setEquipmentTimeId(updatedData.id);
                } else {
                    // Fallback: Clean local state
                    const cleaned = {
                        ...equipmentData,
                        cameraCapture: equipmentData.cameraCapture?.filePath 
                            ? { filePath: equipmentData.cameraCapture.filePath, fileName: equipmentData.cameraCapture.fileName }
                            : equipmentData.cameraCapture?.file 
                                ? { file: equipmentData.cameraCapture.file, fileName: equipmentData.cameraCapture.fileName }
                                : null,
                        documents: equipmentData.documents
                            .filter(doc => !documentsToRemove.includes(doc.id))
                            .map(({ file, ...rest }) => rest)
                    };
                    delete cleaned.documentsToRemove;
                    setEquipmentInfo(cleaned);
                }
            } catch (fetchErr) {
                console.warn('Failed to fetch updated equipment data, using local state:', fetchErr);
                const cleaned = {
                    ...equipmentData,
                    cameraCapture: equipmentData.cameraCapture?.filePath 
                        ? { filePath: equipmentData.cameraCapture.filePath, fileName: equipmentData.cameraCapture.fileName }
                        : equipmentData.cameraCapture?.file 
                            ? { file: equipmentData.cameraCapture.file, fileName: equipmentData.cameraCapture.fileName }
                            : null,
                    documents: equipmentData.documents
                        .filter(doc => !documentsToRemove.includes(doc.id))
                        .map(({ file, ...rest }) => rest)
                };
                delete cleaned.documentsToRemove;
                setEquipmentInfo(cleaned);
            }

            setEditingEquipment(false);
            setPendingEquipmentChanges(null);
            setEquipmentHasBeenSaved(true);
        } catch (err) {
            console.error('Failed to save equipment time:', err);
            const errorMessage = err?.message || 'An unexpected error occurred';
            toast.error(`Failed to save equipment time: ${errorMessage}`);
        }
    }, [equipmentInfo, pendingEquipmentChanges, equipmentTimeId, searchParams, params, toast]);

    // Handle cancel equipment
    const handleCancelEquipment = useCallback(() => {
        if (equipmentTimeId && pendingEquipmentChanges) {
            // For existing equipment, restore original values and exit edit mode
            setEquipmentInfo(pendingEquipmentChanges);
            setEditingEquipment(false);
            setPendingEquipmentChanges(null);
        } else {
            // For new equipment, reset to empty form and collapse the section
            const emptyEquipment = {
                laptopUsed: false,
                pipUsed: false,
                exhibitTech: false,
                parkingCost: '',
                timeAfterFive: '',
                documents: [],
                cameraCapture: null
            };
            setEquipmentInfo(emptyEquipment);
            setPendingEquipmentChanges(null);
            setEditingEquipment(false);
            // Call callback to collapse section if provided
            if (onCancelCallback) {
                onCancelCallback();
            }
        }
    }, [equipmentTimeId, pendingEquipmentChanges, onCancelCallback]);

    // Handle delete equipment
    const handleDeleteEquipment = useCallback(async () => {
        try {
            // If equipment time exists in backend, delete it
            if (equipmentTimeId) {
                const response = await equipmentTimeAPI.deleteEquipmentTime(equipmentTimeId);
                
                // Check backend response
                if (response?.success === false) {
                    toast.error('Failed to delete equipment time');
                    return;
                }
                
                // Success response from backend
                if (response?.success === true) {
                    toast.success('Equipment time deleted successfully');
                }
            } else {
                // No equipment time ID means it was never saved, just reset local state
                toast.success('Equipment time cleared');
            }
            
            // Reset to empty equipment form with Save/Cancel buttons
            const emptyEquipment = {
                laptopUsed: false,
                pipUsed: false,
                exhibitTech: false,
                parkingCost: '',
                timeAfterFive: '',
                documents: [],
                cameraCapture: null
            };
            setEquipmentInfo(emptyEquipment);
            setEditingEquipment(true); // Show Save/Cancel buttons after delete
            setPendingEquipmentChanges(emptyEquipment);
            setEquipmentHasBeenSaved(false);
            setEquipmentTimeId(null);
        } catch (err) {
            console.error('Failed to delete equipment time:', err);
            toast.error('Failed to delete equipment time');
        }
    }, [equipmentTimeId, toast]);

    // Helper to enable edit mode for new equipment (when no jobId or equipment not saved)
    const enableEditModeForNewEquipment = useCallback(() => {
        if (!equipmentHasBeenSaved) {
            setEditingEquipment(true);
            setPendingEquipmentChanges({
                ...equipmentInfo,
                documents: equipmentInfo.documents.map(doc => ({ ...doc })),
                cameraCapture: equipmentInfo.cameraCapture ? { ...equipmentInfo.cameraCapture } : null
            });
        }
    }, [equipmentInfo, equipmentHasBeenSaved]);

    return {
        // State
        equipmentInfo,
        editingEquipment,
        pendingEquipmentChanges,
        equipmentHasBeenSaved,
        equipmentTimeId,
        
        // Handlers
        handleEquipmentCheckbox,
        handleEquipmentInputChange,
        handleEquipmentUpload,
        handleEquipmentDocumentRemove,
        handleEquipmentCameraCapture,
        handleRemoveEquipmentCameraCapture,
        handleEditEquipment,
        handleSaveEquipment,
        handleCancelEquipment,
        handleDeleteEquipment,
        
        // Data fetching
        fetchEquipmentData,
        
        // Helper
        enableEditModeForNewEquipment,
    };
};

