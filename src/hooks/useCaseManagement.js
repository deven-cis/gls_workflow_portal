import { useState, useEffect, useRef, useCallback } from 'react';
import { casesAPI } from '@/services/cases_apis';
import { validateCaseDetails } from '@/lib/utils';

/**
 * Custom hook to manage all case-related state and operations
 * @param {string|number} caseId - The case ID
 * @param {Object} caseInfo - Case information from backend
 * @param {Function} toast - Toast notification function
 * @param {string|number} fallbackCaseNo - Fallback case number from job/task if case_number is null
 * @returns {Object} Case management state and handlers
 */
export const useCaseManagement = (caseId, caseInfo, toast, fallbackCaseNo = null) => {
    // Case form state
    const [formData, setFormData] = useState({ caseName: '', caseNumber: '' });
    const [isCaseEdited, setIsCaseEdited] = useState(false);
    const [editingCase, setEditingCase] = useState(false);
    const [pendingCaseChanges, setPendingCaseChanges] = useState(null);
    const lastSavedRef = useRef({ caseName: '', caseNumber: '' });

    // Sync when caseInfo arrives
    useEffect(() => {
        if (!caseInfo) return;
        const next = {
            caseName: caseInfo.case_short_name ?? '',
            // Use case_number from caseInfo, or fallback to caseNo from task/job
            caseNumber: caseInfo.case_number ?? fallbackCaseNo ?? ''
        };
        setFormData(next);
        lastSavedRef.current = next;
        setIsCaseEdited(false);
    }, [caseInfo, fallbackCaseNo]);

    // Handle edit case
    const handleEditCase = useCallback(() => {
        setEditingCase(true);
        // Store current state as pending changes for cancel
        setPendingCaseChanges({ ...formData });
    }, [formData]);

    // Handle save case
    const handleSaveCase = useCallback(async (localFormData) => {
        if (!caseId) return;
        
        // Validation: Check if case name and case number are not empty
        // Use localFormData if it exists (even if empty string), otherwise fall back to formData
        const caseNameRaw = localFormData?.hasOwnProperty('caseName')
            ? localFormData.caseName 
            : (formData?.caseName ?? '');
        const caseNumberRaw = localFormData?.hasOwnProperty('caseNumber')
            ? localFormData.caseNumber 
            : (formData?.caseNumber ?? '');
        
        // Convert to string and trim
        const caseName = String(caseNameRaw).trim();
        const caseNumber = String(caseNumberRaw).trim();

        // Use reusable validation function
        const validation = validateCaseDetails(caseName, caseNumber);
        if (!validation.isValid) {
            validation.errors.forEach(error => toast.error(error));
            return;
        }
        
        const payload = {
            case_short_name: caseName,
            case_number: caseNumber
        };

        try {
            await casesAPI.editCase(caseId, payload);
            // Update formData with saved values
            setFormData({
                caseName: caseName,
                caseNumber: caseNumber
            });
            lastSavedRef.current = {
                caseName: caseName,
                caseNumber: caseNumber
            };
            setEditingCase(false);
            setPendingCaseChanges(null);
            setIsCaseEdited(false);
            toast.success('Case details updated successfully');
        } catch (err) {
            toast.error('Failed to update case details');
        }
    }, [caseId, formData, toast]);

    // Handle cancel case
    const handleCancelCase = useCallback(() => {
        if (pendingCaseChanges) {
            // Restore original values
            setFormData(pendingCaseChanges);
        }
        setEditingCase(false);
        setPendingCaseChanges(null);
    }, [pendingCaseChanges]);

    return {
        // State
        formData,
        isCaseEdited,
        editingCase,
        pendingCaseChanges,
        
        // Handlers
        handleEditCase,
        handleSaveCase,
        handleCancelCase,
        setFormData
    };
};

