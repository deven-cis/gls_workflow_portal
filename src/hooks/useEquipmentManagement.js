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
        documents: []
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
                    documents: (equipmentData.documents || []).map((doc) => ({
                        id: doc.id ? `doc-${doc.id}` : `doc-${Date.now()}-${Math.random()}`,
                        name: doc.file_name || doc.name || 'Unknown',
                        size: doc.size || 0,
                        type: doc.file_name?.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
                        uploadedAt: doc.created_at || doc.uploaded_at || new Date().toISOString(),
                        backendId: doc.id,
                        filePath: doc.file_path
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
                    documents: []
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
                documents: []
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
                response = await equipmentTimeAPI.updateEquipmentTime(equipmentTimeId, equipmentData, pendingEquipmentChanges, jobNo);
                toast.success('Equipment time updated successfully');
            } else {
                // Create new equipment time
                response = await equipmentTimeAPI.createEquipmentTime(jobNo, equipmentData);
                // Store equipment time ID from response
                if (response?.result?.id) {
                    setEquipmentTimeId(response.result.id);
                }
                toast.success('Equipment time saved successfully');
            }

            // Fetch updated equipment data to get documents with backend IDs
            // Add a small delay to ensure backend has processed the documents
            try {
                // Wait a bit for backend to process documents
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const updatedEquipmentData = await equipmentTimeAPI.getJobEquipmentTime(jobNo);
                
                if (updatedEquipmentData) {
                    // Map backend response to frontend format with documents
                    const mappedDocuments = (updatedEquipmentData.documents || []).map((doc) => {
                        // Use doc.id as the primary id, fallback to generated id if missing
                        const docId = doc.id ? `doc-${doc.id}` : `doc-${Date.now()}-${Math.random()}`;
                        return {
                            id: docId,
                            name: doc.file_name || doc.name || 'Unknown',
                            size: doc.size || 0,
                            type: doc.file_name?.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
                            uploadedAt: doc.created_at || doc.uploaded_at || new Date().toISOString(),
                            backendId: doc.id, // Store backend ID separately
                            filePath: doc.file_path
                        };
                    });
                    
                    setEquipmentInfo({
                        laptopUsed: updatedEquipmentData.laptop_used ?? false,
                        pipUsed: updatedEquipmentData.pip_used ?? false,
                        exhibitTech: updatedEquipmentData.exhibit_tech ?? false,
                        parkingCost: updatedEquipmentData.parking_cost ? String(updatedEquipmentData.parking_cost) : '',
                        timeAfterFive: updatedEquipmentData.time_after ?? '',
                        documents: mappedDocuments
                    });
                    if (updatedEquipmentData.id) {
                        setEquipmentTimeId(updatedEquipmentData.id);
                    }
                } else {
                    // Fallback: Update local state - remove file objects and documentsToRemove after successful save
                    const cleanedEquipment = {
                        ...equipmentData,
                        documents: equipmentData.documents
                            .filter(doc => !documentsToRemove.includes(doc.id))
                            .map(doc => {
                                const { file, ...docWithoutFile } = doc;
                                return docWithoutFile;
                            })
                    };
                    delete cleanedEquipment.documentsToRemove;
                    setEquipmentInfo(cleanedEquipment);
                }
            } catch (fetchErr) {
                // If fetch fails, use fallback approach
                console.warn('Failed to fetch updated equipment data after save, using local state:', fetchErr);
                const cleanedEquipment = {
                    ...equipmentData,
                    documents: equipmentData.documents
                        .filter(doc => !documentsToRemove.includes(doc.id))
                        .map(doc => {
                            const { file, ...docWithoutFile } = doc;
                            return docWithoutFile;
                        })
                };
                delete cleanedEquipment.documentsToRemove;
                setEquipmentInfo(cleanedEquipment);
            }

            setEditingEquipment(false);
            setPendingEquipmentChanges(null);
            setEquipmentHasBeenSaved(true);
        } catch (err) {
            console.error('Failed to save equipment time:', err);
            toast.error(equipmentTimeId ? 'Failed to update equipment time' : 'Failed to save equipment time');
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
                documents: []
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
                    toast.error(response?.message || 'Failed to delete equipment time');
                    return;
                }
                
                // Success response from backend
                if (response?.success === true) {
                    toast.success(response?.message || 'Equipment time deleted successfully');
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
                documents: []
            };
            setEquipmentInfo(emptyEquipment);
            setEditingEquipment(true); // Show Save/Cancel buttons after delete
            setPendingEquipmentChanges(emptyEquipment);
            setEquipmentHasBeenSaved(false);
            setEquipmentTimeId(null);
        } catch (err) {
            console.error('Failed to delete equipment time:', err);
            const errorMessage = err?.response?.data?.message || err?.message || 'Failed to delete equipment time';
            toast.error(errorMessage);
        }
    }, [equipmentTimeId, toast]);

    // Helper to enable edit mode for new equipment (when no jobId or equipment not saved)
    const enableEditModeForNewEquipment = useCallback(() => {
        if (!equipmentHasBeenSaved) {
            setEditingEquipment(true);
            setPendingEquipmentChanges({
                ...equipmentInfo,
                documents: equipmentInfo.documents.map(doc => ({ ...doc }))
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

