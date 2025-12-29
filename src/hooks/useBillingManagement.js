import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { billingAPI } from '@/services/billings_apis';

/**
 * Custom hook to manage all billing-related state and operations
 * @param {Function} toast - Toast notification function
 * @param {boolean} isUpcomingTask - Whether the task is an upcoming task (prevents editing)
 * @param {Function} onCancelCallback - Optional callback when billing is cancelled (for collapsing section)
 * @returns {Object} Billing management state and handlers
 */
export const useBillingManagement = (toast, isUpcomingTask = false, onCancelCallback = null) => {
    const params = useParams();
    const searchParams = useSearchParams();
    const selectedJobId = searchParams.get('jobId');

    // Billing state
    const [billingInfo, setBillingInfo] = useState({
        cancelEnRoute: false,
        cancelSetup: false,
        notes: '',
        videographerHours: '',
        fileLengthHours: '',
        documents: []
    });
    const [editingBilling, setEditingBilling] = useState(false);
    const [pendingBillingChanges, setPendingBillingChanges] = useState(null);
    const [billingHasBeenSaved, setBillingHasBeenSaved] = useState(false);
    const [billingId, setBillingId] = useState(null);

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

    // Fetch billing data from backend
    const fetchBillingData = useCallback(async () => {
        if (!selectedJobId) return;
        
        try {
            // Get billing by job_no (backend endpoint: GET /billings/get/{job_no})
            const billingData = await billingAPI.getJobBilling(selectedJobId);
            
            if (billingData && billingData.id) {
                // Billing exists - map backend response to frontend format
                setBillingInfo({
                    cancelEnRoute: billingData.cancel_en_route ?? false,
                    cancelSetup: billingData.cancel_setup ?? false,
                    notes: billingData.billing_notes ?? '',
                    videographerHours: billingData.videographer_hours_present ?? '',
                    fileLengthHours: billingData.file_hours_length ?? '',
                    documents: (billingData.documents || []).map((doc) => ({
                        id: doc.id || `doc-${doc.id}-${Date.now()}`,
                        name: doc.file_name || doc.name || 'Unknown',
                        size: doc.size || 0,
                        type: doc.file_name?.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
                        uploadedAt: doc.created_at || doc.uploaded_at || new Date().toISOString(),
                        backendId: doc.id,
                        filePath: doc.file_path
                    }))
                });
                setBillingId(billingData.id);
                setBillingHasBeenSaved(true);
                setEditingBilling(false); // Show Edit/Delete buttons when billing exists
            } else {
                // No billing data exists - show empty form with Save/Cancel buttons
                const emptyBilling = {
                    cancelEnRoute: false,
                    cancelSetup: false,
                    notes: '',
                    videographerHours: '',
                    fileLengthHours: '',
                    documents: []
                };
                setBillingInfo(emptyBilling);
                setBillingId(null);
                setBillingHasBeenSaved(false);
                setEditingBilling(true); // Show Save/Cancel buttons when no billing exists
                setPendingBillingChanges(emptyBilling);
            }
        } catch (err) {
            console.error('Failed to fetch billing data:', err);
            // On error, show empty form
            const emptyBilling = {
                cancelEnRoute: false,
                cancelSetup: false,
                notes: '',
                videographerHours: '',
                fileLengthHours: '',
                documents: []
            };
            setBillingInfo(emptyBilling);
            setBillingId(null);
            setBillingHasBeenSaved(false);
            setEditingBilling(true);
            setPendingBillingChanges(emptyBilling);
        }
    }, [selectedJobId]);

    // Fetch billing data when selectedJobId changes
    useEffect(() => {
        fetchBillingData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedJobId]);

    // Handle billing toggle (for checkboxes)
    const handleBillingToggle = useCallback((field) => {
        if (!editingBilling) return;
        setBillingInfo((prev) => ({ ...prev, [field]: !prev[field] }));
    }, [editingBilling]);

    // Handle billing input change
    const handleBillingInputChange = useCallback((field, value) => {
        if (!editingBilling) return;
        setBillingInfo((prev) => ({ ...prev, [field]: value }));
    }, [editingBilling]);

    // Handle billing document upload
    const handleBillingUpload = useCallback((file) => {
        if (!editingBilling) return;
        const meta = createDocumentMeta(file);
        if (!meta) return;
        // Keep File object so we can send it to backend when saving billing
        const document = { ...meta, file };
        setBillingInfo((prev) => ({ ...prev, documents: [...prev.documents, document] }));
    }, [editingBilling, createDocumentMeta]);

    // Handle billing document remove
    const handleBillingDocumentRemove = useCallback((documentId) => {
        if (!editingBilling) return;
        setBillingInfo((prev) => ({
            ...prev,
            documents: prev.documents.filter((doc) => doc.id !== documentId)
        }));
    }, [editingBilling]);

    // Handle edit billing
    const handleEditBilling = useCallback(() => {
        // Prevent editing for upcoming tasks
        if (isUpcomingTask) {
            return;
        }
        setEditingBilling(true);
        // Store current state as pending changes for cancel (deep copy documents array)
        setPendingBillingChanges({
            ...billingInfo,
            documents: billingInfo.documents.map(doc => ({ ...doc }))
        });
    }, [isUpcomingTask, billingInfo]);

    // Handle save billing
    const handleSaveBilling = useCallback(async () => {
        const parseHours = (raw) => {
            if (!raw) return null;
            const cleaned = String(raw).toLowerCase().replace(/hrs?/, '').trim();
            if (!cleaned) return null;
            const num = parseFloat(cleaned);
            return Number.isNaN(num) ? null : num;
        };

        const rawVideographerHours = billingInfo.videographerHours?.trim();
        const rawFileLengthHours = billingInfo.fileLengthHours?.trim();

        const videographerValue = parseHours(rawVideographerHours);
        const fileLengthValue = parseHours(rawFileLengthHours);

        // Validate videographer hours
        if (rawVideographerHours && (videographerValue === null || videographerValue < 0)) {
            toast.error('Videographer hours must be a valid positive number (e.g. 4 or 4hrs)');
            return;
        }

        if (rawFileLengthHours && (fileLengthValue === null || fileLengthValue < 0)) {
            toast.error('File length hours must be a valid positive number (e.g. 8 or 8hrs)');
            return;
        }

        // Normalise display to "Xhrs" format like Figma while keeping numeric value validated
        const normalisedBilling = {
            ...billingInfo,
            videographerHours:
                rawVideographerHours && videographerValue !== null ? `${videographerValue}hrs` : '',
            fileLengthHours:
                rawFileLengthHours && fileLengthValue !== null ? `${fileLengthValue}hrs` : '',
        };

        // Determine which documents were removed (compare with original)
        const originalDocIds = new Set((pendingBillingChanges?.documents || []).map(doc => doc.id));
        const currentDocIds = new Set((billingInfo.documents || []).map(doc => doc.id));
        const documentsToRemove = Array.from(originalDocIds).filter(id => !currentDocIds.has(id));

        // Add documentsToRemove to normalisedBilling for update API
        if (billingId && documentsToRemove.length > 0) {
            normalisedBilling.documentsToRemove = documentsToRemove;
        }

        // Persist billing to backend
        try {
            const jobIdParam = searchParams.get('jobId');
            const jobNo = Number(jobIdParam ?? params?.id);
            if (!jobNo || Number.isNaN(jobNo)) {
                toast.error('Unable to determine job number for billing');
                return;
            }

            let response;
            if (billingId) {
                // Update existing billing - only send changed fields
                response = await billingAPI.updateBilling(billingId, normalisedBilling, pendingBillingChanges, jobNo);
                toast.success('Billing information updated successfully');
            } else {
                // Create new billing
                response = await billingAPI.createBilling(jobNo, normalisedBilling);
                // Store billing ID from response
                if (response?.result?.id) {
                    setBillingId(response.result.id);
                }
                toast.success('Billing information saved successfully');
            }

            // Fetch updated billing data to get documents with backend IDs
            try {
                const updatedBillingData = await billingAPI.getJobBilling(jobNo);
                
                if (updatedBillingData) {
                    // Map backend response to frontend format with documents
                    setBillingInfo({
                        cancelEnRoute: updatedBillingData.cancel_en_route ?? false,
                        cancelSetup: updatedBillingData.cancel_setup ?? false,
                        notes: updatedBillingData.billing_notes ?? '',
                        videographerHours: updatedBillingData.videographer_hours_present ?? '',
                        fileLengthHours: updatedBillingData.file_hours_length ?? '',
                        documents: (updatedBillingData.documents || []).map((doc) => ({
                            id: doc.id || `doc-${doc.id}-${Date.now()}`,
                            name: doc.file_name || doc.name || 'Unknown',
                            size: doc.size || 0,
                            type: doc.file_name?.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
                            uploadedAt: doc.created_at || doc.uploaded_at || new Date().toISOString(),
                            backendId: doc.id,
                            filePath: doc.file_path
                        }))
                    });
                    if (updatedBillingData.id) {
                        setBillingId(updatedBillingData.id);
                    }
                } else {
                    // Fallback: Update local state - remove file objects and documentsToRemove after successful save
                    const cleanedBilling = {
                        ...normalisedBilling,
                        documents: normalisedBilling.documents
                            .filter(doc => !documentsToRemove.includes(doc.id))
                            .map(doc => {
                                const { file, ...docWithoutFile } = doc;
                                return docWithoutFile;
                            })
                    };
                    delete cleanedBilling.documentsToRemove;
                    setBillingInfo(cleanedBilling);
                }
            } catch (fetchErr) {
                // If fetch fails, use fallback approach
                console.warn('Failed to fetch updated billing data after save, using local state:', fetchErr);
                const cleanedBilling = {
                    ...normalisedBilling,
                    documents: normalisedBilling.documents
                        .filter(doc => !documentsToRemove.includes(doc.id))
                        .map(doc => {
                            const { file, ...docWithoutFile } = doc;
                            return docWithoutFile;
                        })
                };
                delete cleanedBilling.documentsToRemove;
                setBillingInfo(cleanedBilling);
            }

            setEditingBilling(false);
            setPendingBillingChanges(null);
            setBillingHasBeenSaved(true);
        } catch (err) {
            console.error('Failed to save billing information:', err);
            toast.error(billingId ? 'Failed to update billing information' : 'Failed to save billing information');
        }
    }, [billingInfo, pendingBillingChanges, billingId, searchParams, params, toast]);

    // Handle cancel billing
    const handleCancelBilling = useCallback(() => {
        if (billingId && pendingBillingChanges) {
            // For existing billing, restore original values and exit edit mode
            setBillingInfo(pendingBillingChanges);
            setEditingBilling(false);
            setPendingBillingChanges(null);
        } else {
            // For new billing, reset to empty form and collapse the section
            const emptyBilling = {
                cancelEnRoute: false,
                cancelSetup: false,
                notes: '',
                videographerHours: '',
                fileLengthHours: '',
                documents: []
            };
            setBillingInfo(emptyBilling);
            setPendingBillingChanges(null);
            setEditingBilling(false);
            // Call callback to collapse section if provided
            if (onCancelCallback) {
                onCancelCallback();
            }
        }
    }, [billingId, pendingBillingChanges, onCancelCallback]);

    // Handle delete billing
    const handleDeleteBilling = useCallback(async () => {
        try {
            // If billing exists in backend, delete it
            if (billingId) {
                const response = await billingAPI.deleteBilling(billingId);
                
                // Check backend response
                if (response?.success === false) {
                    toast.error(response?.message || 'Failed to delete billing information');
                    return;
                }
                
                // Success response from backend
                if (response?.success === true) {
                    toast.success(response?.message || 'Billing information deleted successfully');
                }
            } else {
                // No billing ID means it was never saved, just reset local state
                toast.success('Billing information cleared');
            }
            
            // Reset to empty billing form with Save/Cancel buttons
            const emptyBilling = {
                cancelEnRoute: false,
                cancelSetup: false,
                notes: '',
                videographerHours: '',
                fileLengthHours: '',
                documents: []
            };
            setBillingInfo(emptyBilling);
            setEditingBilling(true); // Show Save/Cancel buttons after delete
            setPendingBillingChanges(emptyBilling);
            setBillingHasBeenSaved(false);
            setBillingId(null);
        } catch (err) {
            console.error('Failed to delete billing information:', err);
            const errorMessage = err?.response?.data?.message || err?.message || 'Failed to delete billing information';
            toast.error(errorMessage);
        }
    }, [billingId, toast]);

    // Expose fetchBillingData for external calls (e.g., when section opens)
    return {
        // State
        billingInfo,
        editingBilling,
        pendingBillingChanges,
        billingHasBeenSaved,
        billingId,
        
        // Handlers
        handleBillingToggle,
        handleBillingInputChange,
        handleBillingUpload,
        handleBillingDocumentRemove,
        handleEditBilling,
        handleSaveBilling,
        handleCancelBilling,
        handleDeleteBilling,
        
        // Data fetching
        fetchBillingData,
    };
};

