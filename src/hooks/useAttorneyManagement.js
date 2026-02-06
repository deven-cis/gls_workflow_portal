import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { attorneysAPI } from '@/services/attorneys_apis';
import { createAttorneySection } from '@/lib/utils';

/**
 * Custom hook to manage all attorney-related state and operations
 * @param {Function} toast - Toast notification function
 * @returns {Object} Attorney management state and handlers
 */
export const useAttorneyManagement = (toast) => {
    const searchParams = useSearchParams();
    const selectedJobId = searchParams.get('jobId');

    // Attorney state
    const [attorneySections, setAttorneySections] = useState([
        createAttorneySection('Taking Attorney')
    ]);
    const [expandedAttorney, setExpandedAttorney] = useState(null);
    const [editingAttorney, setEditingAttorney] = useState(null);
    
    // Ref to track ongoing delete operations to prevent duplicate API calls
    const deletingRef = useRef(new Set());
    
    // Ref to track ongoing save operations to prevent duplicate API calls
    const savingRef = useRef(new Set());
    
    // Ref to store current attorney sections for synchronous access
    const attorneySectionsRef = useRef(attorneySections);
    
    // Keep ref in sync with state
    useEffect(() => {
        attorneySectionsRef.current = attorneySections;
    }, [attorneySections]);

    // Fetch attorneys from backend when jobId is available
    useEffect(() => {
        const fetchAttorneys = async () => {
            if (!selectedJobId) return;
            
            try {
                const attorneysData = await attorneysAPI.getJobAttorneys(selectedJobId);
                
                if (Array.isArray(attorneysData) && attorneysData.length > 0) {
                    // Map backend response to frontend format (reusing same logic as handleAddAttorneySection)
                    const mappedSections = await Promise.all(attorneysData.map(async (attorney, index) => {
                        // Use same title logic: first is "Taking Attorney", rest are numbered
                        const title = index === 0 ? 'Taking Attorney' : `Attorney ${index}`;
                        
                        // Map document if file exists
                        let documents = [];
                        if (attorney.file_name) {
                            let fileSize = 0;
                            // If filePath exists, fetch file size from server
                            if (attorney.file_name_path) {
                                const { fetchDocumentFileSize } = await import('@/lib/utils');
                                const fetchedSize = await fetchDocumentFileSize(attorney.file_name_path);
                                if (fetchedSize) {
                                    fileSize = fetchedSize;
                                }
                            }
                            // Convert entered_at to ISO string if it exists, otherwise use current date
                            let uploadedAtDate = new Date().toISOString();
                            if (attorney.entered_at) {
                                // If it's already a string, use it; if it's a Date object, convert to ISO string
                                if (typeof attorney.entered_at === 'string') {
                                    uploadedAtDate = attorney.entered_at;
                                } else if (attorney.entered_at instanceof Date) {
                                    uploadedAtDate = attorney.entered_at.toISOString();
                                } else {
                                    // Try to parse as date and convert to ISO string
                                    try {
                                        uploadedAtDate = new Date(attorney.entered_at).toISOString();
                                    } catch (e) {
                                        uploadedAtDate = new Date().toISOString();
                                    }
                                }
                            }
                            
                            documents = [{
                                id: `doc-${attorney.id}-${Date.now()}`,
                                name: attorney.file_name,
                                size: fileSize,
                                type: attorney.file_name?.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
                                uploadedAt: uploadedAtDate,
                                backendId: attorney.id,
                                filePath: attorney.file_name_path
                            }];
                        }
                        
                        // Map camera capture if file exists
                        let cameraCapture = null;
                        if (attorney.camera_captured_file_name) {
                            let cameraFileSize = 0;
                            // If camera filePath exists, fetch file size from server
                            if (attorney.camera_captured_file_path) {
                                const { fetchDocumentFileSize } = await import('@/lib/utils');
                                const fetchedSize = await fetchDocumentFileSize(attorney.camera_captured_file_path);
                                if (fetchedSize) {
                                    cameraFileSize = fetchedSize;
                                }
                            }
                            // Convert entered_at to ISO string if it exists, otherwise use current date
                            let cameraUploadedAtDate = new Date().toISOString();
                            if (attorney.entered_at) {
                                if (typeof attorney.entered_at === 'string') {
                                    cameraUploadedAtDate = attorney.entered_at;
                                } else if (attorney.entered_at instanceof Date) {
                                    cameraUploadedAtDate = attorney.entered_at.toISOString();
                                } else {
                                    try {
                                        cameraUploadedAtDate = new Date(attorney.entered_at).toISOString();
                                    } catch (e) {
                                        cameraUploadedAtDate = new Date().toISOString();
                                    }
                                }
                            }
                            
                            cameraCapture = {
                                id: `camera-${attorney.id}-${Date.now()}`,
                                name: attorney.camera_captured_file_name,
                                size: cameraFileSize,
                                type: 'image/jpeg',
                                uploadedAt: cameraUploadedAtDate,
                                backendId: attorney.id,
                                filePath: attorney.camera_captured_file_path
                            };
                        }
                        
                        return {
                            id: `attorney-${attorney.id}`, // Use backend ID for consistency
                            backendId: attorney.id,
                            title: title,
                            fields: {
                                attorneyName: attorney.attorney_name || '',
                                firmName: attorney.firm_name || '',
                                notes: attorney.notes || '',
                                orderDetails: attorney.order_details || ''
                            },
                            documents: documents,
                            cameraCapture: cameraCapture
                        };
                    }));
                    
                    setAttorneySections(mappedSections);
                } else {
                    // No attorneys found, keep default "Taking Attorney"
                    setAttorneySections([createAttorneySection('Taking Attorney')]);
                }
            } catch (err) {
                // On error, keep default "Taking Attorney"
                setAttorneySections([createAttorneySection('Taking Attorney')]);
            }
        };
        
        fetchAttorneys();
    }, [selectedJobId]);

    // Handle attorney field change
    const handleAttorneyFieldChange = useCallback((sectionId, field, value) => {
        setAttorneySections((prev) =>
            prev.map((section) =>
                section.id === sectionId
                    ? { 
                        ...section, 
                        fields: { ...section.fields, [field]: value },
                        // Preserve backendId when updating fields
                        backendId: section.backendId
                    }
                    : section
            )
        );
    }, []);

    // Handle attorney document upload
    const handleAttorneyUpload = useCallback((sectionId, file) => {
        if (!file) return;
        setAttorneySections((prev) => {
            const section = prev.find(s => s.id === sectionId);
            if (!section) return prev;

            // Store File object locally - will be sent with update/create API call
            const newDoc = {
                id: `${sectionId}-${Date.now()}`,
                name: file.name,
                size: file.size,
                type: file.type,
                uploadedAt: new Date().toISOString(),
                file: file // Store File object to send with create/update API call
            };
            return prev.map((s) =>
                s.id === sectionId
                    ? { 
                        ...s, 
                        documents: [newDoc], // Replace existing document (only one document allowed)
                        // Preserve backendId when uploading document
                        backendId: s.backendId
                    }
                    : s
            );
        });
    }, []);

    // Handle attorney camera capture
    const handleAttorneyCameraCapture = useCallback((sectionId, file) => {
        if (!file) return;
        setAttorneySections((prev) => {
            const section = prev.find(s => s.id === sectionId);
            if (!section) return prev;

            // Store File object locally - will be sent with update/create API call
            const newCameraCapture = {
                id: `camera-${sectionId}-${Date.now()}`,
                name: file.name,
                size: file.size,
                type: file.type,
                uploadedAt: new Date().toISOString(),
                file: file // Store File object to send with create/update API call
            };
            return prev.map((s) =>
                s.id === sectionId
                    ? { 
                        ...s, 
                        cameraCapture: newCameraCapture,
                        // Preserve backendId when capturing camera
                        backendId: s.backendId
                    }
                    : s
            );
        });
    }, []);

    // Handle remove attorney camera capture
    const handleRemoveAttorneyCameraCapture = useCallback((sectionId) => {
        setAttorneySections((prev) =>
            prev.map((s) =>
                s.id === sectionId
                    ? {
                          ...s,
                          cameraCapture: null,
                          // Preserve backendId when removing camera capture
                          backendId: s.backendId
                      }
                    : s
            )
        );
    }, []);

    // Handle remove attorney document
    const handleRemoveAttorneyDocument = useCallback((sectionId, documentId) => {
        // Remove from local state - will be handled by update API call
        setAttorneySections((prev) =>
            prev.map((s) =>
                s.id === sectionId
                    ? {
                          ...s,
                          documents: s.documents.filter((doc) => doc.id !== documentId),
                          // Preserve backendId when removing document
                          backendId: s.backendId
                      }
                    : s
            )
        );
    }, []);

    // Handle add attorney section
    const handleAddAttorneySection = useCallback(() => {
        setAttorneySections((prev) => {
            const hasCopy = prev.some((section) => section.title === 'Copy of Attorney');
            const numberedCount = prev.filter((section) => /^Attorney\s\d+$/i.test(section.title)).length;
            const title = hasCopy ? `Attorney ${numberedCount + 1}` : 'Copy of Attorney';
            const newSection = createAttorneySection(title);
            
            // Auto-expand and enable editing for new section
            setExpandedAttorney(newSection.id);
            setEditingAttorney(newSection.id);
            
            return [...prev, newSection];
        });
    }, []);

    // Handle remove attorney section
    const handleRemoveAttorneySection = useCallback(async (sectionId) => {
        // Prevent duplicate delete calls for the same section
        if (deletingRef.current.has(sectionId)) {
            console.warn('Delete already in progress for section:', sectionId);
            return;
        }
        
        // Get backendId from ref (synchronous access to current state)
        const currentSections = attorneySectionsRef.current;
        const section = currentSections.find(s => s.id === sectionId);
        
        if (!section) {
            return;
        }
        
        // Store backendId before removing from state
        const backendIdToDelete = section.backendId;
        
        // Remove from local state
        setAttorneySections((prev) => {
            const updated = prev.filter((s) => s.id !== sectionId);
            // If all attorneys are deleted, ensure at least one empty form remains
            const finalSections = updated.length === 0 
                ? [createAttorneySection('Taking Attorney')] 
                : updated;
            
            return finalSections;
        });
        
        // Update expanded/editing state
        if (expandedAttorney === sectionId) {
            setExpandedAttorney(null);
        }
        if (editingAttorney === sectionId) {
            setEditingAttorney(null);
        }
        
        // Make API call OUTSIDE of setState to prevent duplicate calls
        // Only make API call if attorney has backendId and jobId is available
        if (backendIdToDelete && selectedJobId) {
            // Mark this section as being deleted
            deletingRef.current.add(sectionId);
            
            attorneysAPI.deleteAttorney(backendIdToDelete)
                .then((response) => {
                    toast.success('Attorney deleted successfully');
                })
                .catch((err) => {
                    console.error('Failed to delete attorney:', err);
                    // Only show error if it's not a 404 (already deleted)
                    if (err?.response?.status !== 404 && err?.status !== 404) {
                        toast.error('Failed to delete attorney');
                    }
                })
                .finally(() => {
                    // Remove from deleting set after API call completes
                    deletingRef.current.delete(sectionId);
                });
        } else {
            // If no backendId, just remove from local state (no API call needed)
            // No need to track in deletingRef since no API call
        }
    }, [selectedJobId, expandedAttorney, editingAttorney, toast]);

    // Handle save attorney
    const handleSaveAttorney = useCallback(async (sectionId) => {
        // Prevent duplicate save calls for the same section
        if (savingRef.current.has(sectionId)) {
            console.warn('Save already in progress for section:', sectionId);
            return;
        }
        
        // Get section data directly from ref (synchronous access to current state)
        const currentSections = attorneySectionsRef.current;
        const section = currentSections.find(s => s.id === sectionId);
        
        if (!section || !selectedJobId) {
            setEditingAttorney(null);
            return;
        }
        
        // Extract data from section
        const sectionData = section;
        const attorneyData = {
            attorneyName: section.fields.attorneyName,
            firmName: section.fields.firmName,
            notes: section.fields.notes,
            orderDetails: section.fields.orderDetails,
        };
        
        // Get the first document file if it exists (for both create and update)
        const documentFile = section.documents.find(doc => doc.file)?.file || null;
        
        // Check if document was removed:
        // - If section has backendId (existing attorney) 
        // - AND documents array is empty (user removed it)
        // - AND no new file uploaded
        // Then we need to explicitly send empty document field to remove it
        // Note: This might also trigger if attorney never had a document, but backend handles it correctly
        const isExistingAttorney = !!section.backendId;
        const hasNewFile = !!documentFile;
        const documentsNowEmpty = section.documents.length === 0;
        const shouldRemoveDocument = isExistingAttorney && documentsNowEmpty && !hasNewFile;
        
        // Get camera capture file if it exists (for both create and update)
        const cameraFile = section.cameraCapture?.file || null;
        
        // Check if camera capture was removed:
        // - If section has backendId (existing attorney)
        // - AND cameraCapture is null (user removed it)
        // - AND no new camera file uploaded
        // Then we need to explicitly send empty camera field to remove it
        // 
        // IMPORTANT: After deletion, section.cameraCapture is null, so we can't check filePath/backendId
        // Instead, we check if the section has a backendId (meaning it was loaded from backend)
        // and if cameraCapture is null. If both are true and there's no new file, assume it was removed.
        // The backend will handle it correctly - if the attorney never had a camera, sending empty won't cause issues.
        const shouldRemoveCameraFile = isExistingAttorney && !section.cameraCapture && !cameraFile;
        const hasBackendId = section.backendId != null;
        
        // Validate we have the data
        if (!sectionData || !attorneyData || !selectedJobId) {
            return;
        }
        
        // Mark this section as being saved
        savingRef.current.add(sectionId);
        
        // Perform API call
        if (hasBackendId) {
            // UPDATE existing attorney
            attorneysAPI.updateAttorney(sectionData.backendId, attorneyData, documentFile, shouldRemoveDocument, cameraFile, shouldRemoveCameraFile)
                .then((response) => {
                    const updatedAttorney = response?.result || response;
                    
                    if (!updatedAttorney?.id) {
                        console.error('Invalid update response:', response);
                        toast.error('Failed to update attorney: Invalid response from server');
                        savingRef.current.delete(sectionId);
                        return;
                    }
                    
                    // Map document from backend response - if file_name is null, documents array is empty
                    const updatedDocuments = updatedAttorney?.file_name ? [{
                        id: `doc-${updatedAttorney.id}-${Date.now()}`,
                        name: updatedAttorney.file_name,
                        size: 0,
                        type: updatedAttorney.file_name?.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
                        uploadedAt: new Date().toISOString(),
                        backendId: updatedAttorney.id,
                        filePath: updatedAttorney.file_name_path
                    }] : []; // Empty array if no document
                    
                    // Map camera capture from backend response - if camera_captured_file_name is null, cameraCapture is null
                    const updatedCameraCapture = updatedAttorney?.camera_captured_file_name ? {
                        id: `camera-${updatedAttorney.id}-${Date.now()}`,
                        name: updatedAttorney.camera_captured_file_name,
                        size: 0,
                        type: 'image/jpeg',
                        uploadedAt: new Date().toISOString(),
                        backendId: updatedAttorney.id,
                        filePath: updatedAttorney.camera_captured_file_path
                    } : null; // Null if no camera file
                    
                    setAttorneySections((prevSections) => {
                        const mapped = prevSections.map((s) => {
                            if (s.id === sectionId) {
                                return {
                                    ...s,
                                    backendId: updatedAttorney.id, // Preserve backendId for future updates
                                    fields: {
                                        attorneyName: updatedAttorney.attorney_name || s.fields.attorneyName,
                                        firmName: updatedAttorney.firm_name || s.fields.firmName,
                                        notes: updatedAttorney.notes || s.fields.notes,
                                        orderDetails: updatedAttorney.order_details || s.fields.orderDetails,
                                    },
                                    documents: updatedDocuments, // Use backend response data - will be empty if document was removed
                                    cameraCapture: updatedCameraCapture // Use backend response data - will be null if camera was removed
                                };
                            }
                            return s;
                        });
                        return mapped;
                    });
                    toast.success('Attorney updated successfully');
                    setEditingAttorney(null);
                })
                .catch((err) => {
                    console.error('Error updating attorney:', err);
                    const errorMessage = err?.message || 'Unknown error occurred';
                    toast.error(`Failed to update attorney: ${errorMessage}`);
                    savingRef.current.delete(sectionId);
                })
                .finally(() => {
                    // Remove from saving set after API call completes
                    savingRef.current.delete(sectionId);
                });
        } else {
            // CREATE new attorney
            attorneysAPI.createJobAttorney(selectedJobId, attorneyData, documentFile, cameraFile)
                .then((response) => {
                    // Check if the response indicates failure
                    if (response?.success === false || response?.status_code >= 400) {
                        const errorMessage = response?.message || 'Failed to create attorney';
                        console.error('Attorney creation failed:', response);
                        toast.error(errorMessage);
                        savingRef.current.delete(sectionId);
                        return;
                    }
                    
                    const createdAttorney = response?.result || response;
                    const attorneyId = createdAttorney?.id;
                    
                    if (!attorneyId) {
                        console.error('No attorney ID found in response:', response);
                        toast.error('Failed to create attorney: Invalid response from server');
                        savingRef.current.delete(sectionId);
                        return;
                    }
                    
                    console.log('Created attorney with ID:', attorneyId);
                    
                    // Map document from backend response
                    const createdDocuments = createdAttorney?.file_name ? [{
                        id: `doc-${createdAttorney.id}-${Date.now()}`,
                        name: createdAttorney.file_name,
                        size: 0,
                        type: createdAttorney.file_name?.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
                        uploadedAt: new Date().toISOString(),
                        backendId: createdAttorney.id,
                        filePath: createdAttorney.file_name_path
                    }] : [];
                    
                    // Map camera capture from backend response
                    const createdCameraCapture = createdAttorney?.camera_captured_file_name ? {
                        id: `camera-${createdAttorney.id}-${Date.now()}`,
                        name: createdAttorney.camera_captured_file_name,
                        size: 0,
                        type: 'image/jpeg',
                        uploadedAt: new Date().toISOString(),
                        backendId: createdAttorney.id,
                        filePath: createdAttorney.camera_captured_file_path
                    } : null;
                    
                    setAttorneySections((prevSections) =>
                        prevSections.map((s) => {
                            if (s.id === sectionId) {
                                return {
                                    ...s,
                                    backendId: attorneyId, // CRITICAL: Set backendId so future saves will UPDATE instead of CREATE
                                    fields: {
                                        attorneyName: createdAttorney.attorney_name || s.fields.attorneyName,
                                        firmName: createdAttorney.firm_name || s.fields.firmName,
                                        notes: createdAttorney.notes || s.fields.notes,
                                        orderDetails: createdAttorney.order_details || s.fields.orderDetails,
                                    },
                                    documents: createdDocuments,
                                    cameraCapture: createdCameraCapture
                                };
                            }
                            return s;
                        })
                    );
                    toast.success('Attorney created successfully');
                    setEditingAttorney(null);
                })
                .catch((err) => {
                    console.error('Error creating attorney:', err);
                    const errorMessage = err?.message || 'Unknown error occurred';
                    toast.error(`Failed to create attorney: ${errorMessage}`);
                })
                .finally(() => {
                    savingRef.current.delete(sectionId);
                });
        }
    }, [selectedJobId, toast]);

    // Handle cancel attorney
    const handleCancelAttorney = useCallback((sectionId) => {
        // Cancel editing - just close edit mode
        setEditingAttorney(null);
    }, []);

    return {
        // State
        attorneySections,
        expandedAttorney,
        editingAttorney,
        
        // Setters
        setExpandedAttorney,
        setEditingAttorney,
        
        // Handlers
        handleAddAttorneySection,
        handleRemoveAttorneySection,
        handleAttorneyFieldChange,
        handleAttorneyUpload,
        handleRemoveAttorneyDocument,
        handleAttorneyCameraCapture,
        handleRemoveAttorneyCameraCapture,
        handleSaveAttorney,
        handleCancelAttorney,
    };
};

