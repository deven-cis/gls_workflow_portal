"use client";
import { useRef, useState, useEffect } from 'react';
import { useParams, useRouter , useSearchParams} from 'next/navigation';
import { MapPin, Clock, MoreVertical, ChevronDown, ChevronUp, Trash2, Clock as ClockIcon, Check, Search } from 'lucide-react';
import AvatarMenu from '@/components/layouts/AvatarMenu';
import { createAttorneySection, getInitials } from '@/lib/utils';
import TimeInput from '@/components/task_details/task/TimeInput';
import AddActionButton from '@/components/task_details/task/AddActionButton';
import ToggleOption from '@/components/task_details/task/ToggleOption';
import DocumentUpload from '@/components/task_details/task/DocumentUpload';
import CheckboxOption from '@/components/task_details/task/CheckboxOption';
import IconInput from '@/components/task_details/task/IconInput';
import CaseDetails from '@/components/task_details/taskSections/CaseDetails';
import WitnessManagement from '@/components/task_details/taskSections/WitnessManagement';
import AttorneyOrders from '@/components/task_details/taskSections/AttorneyOrders';
import BillingInfo from '@/components/task_details/taskSections/BillingInfo';
import EquipmentSection from '@/components/task_details/taskSections/EquipmentSection';
import { taskAPI } from '@/services/api';
import { billingAPI } from '@/services/billings_apis';
import { equipmentTimeAPI } from '@/services/equipment_time_apis';
import { witnessesAPI } from '@/services/witnesses_apis';
import { attorneysAPI } from '@/services/attorneys_apis';
import { useToast } from '@/contexts/ToastContext';

export default function TaskDetails({ caseId, caseInfo, witnessesData}) {
    const params = useParams();
    const router = useRouter();
    const [expandedStep, setExpandedStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState([]);
    const [formData, setFormData] = useState({ caseName: '', caseNumber: '' });
    const [isCaseEdited, setIsCaseEdited] = useState(false);
    const lastSavedRef = useRef({ caseName: '', caseNumber: '' });
    const [editingCase, setEditingCase] = useState(false);
    const [pendingCaseChanges, setPendingCaseChanges] = useState(null);
    const [witnesses, setWitnesses] = useState([]);
    const [addingWitness, setAddingWitness] = useState(false);
    const [newWitnessName, setNewWitnessName] = useState('');
    const [expandedWitness, setExpandedWitness] = useState(null);
    const [witnessRecords, setWitnessRecords] = useState({});
    const [witnessTemplates, setWitnessTemplates] = useState({});
    const [deletedWitnessVideoIds, setDeletedWitnessVideoIds] = useState({}); // witnessId -> number[]
    const [attorneySections, setAttorneySections] = useState([
        createAttorneySection('Taking Attorney')
    ]);
    const [expandedAttorney, setExpandedAttorney] = useState(null);
    const [editingAttorney, setEditingAttorney] = useState(null);
    const searchParams = useSearchParams();
    const selectedJobId = searchParams.get('jobId');
    const toast = useToast();
    console.log("taskDetails witnessesData:", witnessesData);
    // seed witnesses from page data
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
                    if (rawName) id = byName.get(rawName);
                }
                if (id == null) continue;
                const existing = next[id] ?? {};
                next[id] = {
                    readOnText: raw.read_on_text ?? raw.readOnText ?? existing.readOnText ?? '',
                    readOnTime: raw.read_on_time ?? raw.readOnTime ?? existing.readOnTime ?? '',
                    readOffText: raw.read_off_text ?? raw.readOffText ?? existing.readOffText ?? '',
                    readOffTime: raw.read_off_time ?? raw.readOffTime ?? existing.readOffTime ?? '',
                };
            }
            return next;
        });
    }, [witnessesData]);

    // Fetch attorneys from backend when jobId is available
    useEffect(() => {
        const fetchAttorneys = async () => {
            if (!selectedJobId) return;
            
            try {
                const attorneysData = await attorneysAPI.getJobAttorneys(selectedJobId);
                
                if (Array.isArray(attorneysData) && attorneysData.length > 0) {
                    // Map backend response to frontend format (reusing same logic as handleAddAttorneySection)
                    const mappedSections = attorneysData.map((attorney, index) => {
                        // Use same title logic: first is "Taking Attorney", rest are numbered
                        const title = index === 0 ? 'Taking Attorney' : `Attorney ${index}`;
                        
                        // Map document if file exists
                        const documents = attorney.file_name ? [{
                            id: `doc-${attorney.id}-${Date.now()}`,
                            name: attorney.file_name,
                            size: 0, // Backend doesn't provide size
                            type: attorney.file_name?.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
                            uploadedAt: new Date().toISOString(),
                            backendId: attorney.id,
                            filePath: attorney.file_name_path
                        }] : [];
                        
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
                            documents: documents
                        };
                    });
                    
                    setAttorneySections(mappedSections);
                } else {
                    // No attorneys found, keep default "Taking Attorney"
                    setAttorneySections([createAttorneySection('Taking Attorney')]);
                }
            } catch (err) {
                console.error('Failed to fetch attorneys:', err);
                // On error, keep default "Taking Attorney"
                setAttorneySections([createAttorneySection('Taking Attorney')]);
            }
        };
        
        fetchAttorneys();
    }, [selectedJobId]);

    // sync when caseInfo arrives
    useEffect(() => {
        if (!caseInfo) return;
        const next = {
        caseName: caseInfo.case_short_name ?? '',
        caseNumber: caseInfo.case_number ?? ''
        };
        setFormData(next);
        lastSavedRef.current = next;
        setIsCaseEdited(false);
    }, [caseInfo]);
  
    const handleEditCase = () => {
        setEditingCase(true);
        // Store current state as pending changes for cancel
        setPendingCaseChanges({ ...formData });
    };

    const handleSaveCase = async (localFormData) => {
        if (!caseId) return;
        
        // Validation: Check if case name and case number are not empty
        // Use localFormData if it exists (even if empty string), otherwise fall back to formData
        // Important: Empty string is a valid value that should be used, not fallback to formData
        const caseNameRaw = localFormData?.hasOwnProperty('caseName')
            ? localFormData.caseName 
            : (formData?.caseName ?? '');
        const caseNumberRaw = localFormData?.hasOwnProperty('caseNumber')
            ? localFormData.caseNumber 
            : (formData?.caseNumber ?? '');
        
        // Convert to string and trim
        const caseName = String(caseNameRaw).trim();
        const caseNumber = String(caseNumberRaw).trim();

        // Collect all validation errors
        const errors = [];
        if (!caseName) {
            errors.push('Case Name is required');
        }
        if (!caseNumber) {
            errors.push('Case Number is required');
        }

        // Show all validation errors
        if (errors.length > 0) {
            errors.forEach(error => toast.error(error));
            return;
        }
        
        const payload = {
            case_short_name: caseName,
            case_number: caseNumber
        };

        try {
            await taskAPI.editCase(caseId, payload);
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
            console.error('Failed to update case', err);
            toast.error('Failed to update case details');
        }
    };

    const handleCancelCase = () => {
        if (pendingCaseChanges) {
            // Restore original values
            setFormData(pendingCaseChanges);
        }
        setEditingCase(false);
        setPendingCaseChanges(null);
    };


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
    const [assigneeSearch, setAssigneeSearch] = useState('');
    const [collaboratorSearch, setCollaboratorSearch] = useState('');

    const assignee = {
        name: 'Jakir Hossen',
        role: 'Lead Videographer',
        status: 'me'
    };

    const collaboratorsList = [
        { id: 1, name: 'Arlene McCoy', role: 'Paralegal' },
        { id: 2, name: 'Darlene Robertson', role: 'Coordinator' },
        { id: 3, name: 'Jacob Jones', role: 'Assistant' }
    ];

    const activityTimeline = [
        { label: 'Session start time', time: '10:03 am' }
    ];
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

    // Presentational components are implemented in `src/components/task/` to keep the page file focused on state and layout.

    const createDocumentMeta = (file) => {
        if (!file) return null;
        return {
            id: `${file.name}-${Date.now()}`,
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString()
        };
    };

    const handleAttorneyFieldChange = (sectionId, field, value) => {
        setAttorneySections((prev) =>
            prev.map((section) =>
                section.id === sectionId
                    ? { ...section, fields: { ...section.fields, [field]: value } }
                    : section
            )
        );
    };

    const handleAttorneyUpload = (sectionId, file) => {
        if (!file) return;
        const section = attorneySections.find(s => s.id === sectionId);
        if (!section) return;

        // Store File object locally - will be sent with update/create API call
        const newDoc = {
            id: `${sectionId}-${Date.now()}`,
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString(),
            file: file // Store File object to send with create/update API call
        };
        setAttorneySections((prev) =>
            prev.map((s) =>
                s.id === sectionId
                    ? { ...s, documents: [newDoc] } // Replace existing document (only one document allowed)
                    : s
            )
        );
    };

    const handleRemoveAttorneyDocument = (sectionId, documentId) => {
        // Remove from local state - will be handled by update API call
        setAttorneySections((prev) =>
            prev.map((s) =>
                s.id === sectionId
                    ? {
                          ...s,
                          documents: s.documents.filter((doc) => doc.id !== documentId)
                      }
                    : s
            )
        );
    };

    const handleAddAttorneySection = () => {
        const hasCopy = attorneySections.some((section) => section.title === 'Copy of Attorney');
        const numberedCount = attorneySections.filter((section) => /^Attorney\s\d+$/i.test(section.title)).length;
        const title = hasCopy ? `Attorney ${numberedCount + 1}` : 'Copy of Attorney';
        const newSection = createAttorneySection(title);
        
        setAttorneySections((prev) => [...prev, newSection]);
        // Auto-expand and enable editing for new section
        setExpandedAttorney(newSection.id);
        setEditingAttorney(newSection.id);
    };

    const handleRemoveAttorneySection = async (sectionId) => {
        const section = attorneySections.find(s => s.id === sectionId);
        
        try {
            // If attorney has backend ID, delete via API
            if (section?.backendId && selectedJobId) {
                await attorneysAPI.deleteAttorney(section.backendId);
                toast.success('Attorney deleted successfully');
            }
            
            // Remove from local state
            setAttorneySections((prev) => {
                const updated = prev.filter((s) => s.id !== sectionId);
                // If all attorneys are deleted, ensure at least one empty form remains
                if (updated.length === 0) {
                    return [createAttorneySection('Taking Attorney')];
                }
                return updated;
            });
            if (expandedAttorney === sectionId) {
                setExpandedAttorney(null);
            }
            if (editingAttorney === sectionId) {
                setEditingAttorney(null);
            }
        } catch (err) {
            console.error('Failed to delete attorney:', err);
            toast.error('Failed to delete attorney');
        }
    };

    const handleSaveAttorney = async (sectionId) => {
        const section = attorneySections.find(s => s.id === sectionId);
        if (!section || !selectedJobId) {
            setEditingAttorney(null);
            return;
        }

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
        // Note: We can't perfectly detect if there was originally a document, but if it's an existing
        // attorney with empty documents and no new file, we'll send empty field - backend will handle it correctly
        const isExistingAttorney = !!section.backendId;
        const hasNewFile = !!documentFile;
        const documentsNowEmpty = section.documents.length === 0;
        // If it's an existing attorney with no documents now and no new file, assume document was removed
        const shouldRemoveDocument = isExistingAttorney && documentsNowEmpty && !hasNewFile;

        try {
            if (section.backendId) {
                // Update existing attorney with file in single API call
                const response = await attorneysAPI.updateAttorney(section.backendId, attorneyData, documentFile, shouldRemoveDocument);
                
                // Use backend response to update local state (includes updated document info)
                const updatedAttorney = response?.result || response;
                
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
                
                setAttorneySections((prev) =>
                    prev.map((s) => {
                        if (s.id === sectionId) {
                            return {
                                ...s,
                                backendId: updatedAttorney.id || s.backendId,
                                fields: {
                                    attorneyName: updatedAttorney.attorney_name || s.fields.attorneyName,
                                    firmName: updatedAttorney.firm_name || s.fields.firmName,
                                    notes: updatedAttorney.notes || s.fields.notes,
                                    orderDetails: updatedAttorney.order_details || s.fields.orderDetails,
                                },
                                documents: updatedDocuments // Use backend response data - will be empty if document was removed
                            };
                        }
                        return s;
                    })
                );
                toast.success('Attorney updated successfully');
            } else {
                // Create new attorney with file in single API call
                const response = await attorneysAPI.createJobAttorney(selectedJobId, attorneyData, documentFile);
                setAttorneySections((prev) =>
                    prev.map((s) => {
                        if (s.id === sectionId) {
                            // Remove file objects from documents after successful save (file is now on backend)
                            const cleanedDocuments = s.documents.map(doc => {
                                const { file, ...docWithoutFile } = doc;
                                return docWithoutFile;
                            });
                            return {
                                ...s,
                                backendId: response.id || response.attorney_id,
                                documents: cleanedDocuments
                            };
                        }
                        return s;
                    })
                );
                toast.success('Attorney created successfully');
            }
            setEditingAttorney(null);
        } catch (err) {
            console.error('Failed to save attorney:', err);
            toast.error('Failed to save attorney');
        }
    };

    const handleCancelAttorney = (sectionId) => {
        // Cancel editing - just close edit mode
        setEditingAttorney(null);
    };

    const handleBillingToggle = (field) => {
        if (!editingBilling) return;
        setBillingInfo((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    const handleBillingInputChange = (field, value) => {
        if (!editingBilling) return;
        setBillingInfo((prev) => ({ ...prev, [field]: value }));
    };

    const handleBillingUpload = (file) => {
        if (!editingBilling) return;
        const meta = createDocumentMeta(file);
        if (!meta) return;
        // Keep File object so we can send it to backend when saving billing
        const document = { ...meta, file };
        setBillingInfo((prev) => ({ ...prev, documents: [...prev.documents, document] }));
    };

    const handleBillingDocumentRemove = (documentId) => {
        if (!editingBilling) return;
        setBillingInfo((prev) => ({
            ...prev,
            documents: prev.documents.filter((doc) => doc.id !== documentId)
        }));
    };

    const handleEditBilling = () => {
        setEditingBilling(true);
        // Store current state as pending changes for cancel (deep copy documents array)
        setPendingBillingChanges({
            ...billingInfo,
            documents: billingInfo.documents.map(doc => ({ ...doc }))
        });
    };

    const handleSaveBilling = async () => {
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
    };

    const handleCancelBilling = () => {
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
            // Collapse the billing section (step 4)
            setExpandedStep(expandedStep === 4 ? null : expandedStep);
        }
    };

    const handleDeleteBilling = async () => {
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
    };

    const handleEquipmentCheckbox = (field) => {
        if (!editingEquipment) return;
        setEquipmentInfo((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    const handleEquipmentInputChange = (field, value) => {
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
    };

    const handleEquipmentUpload = (file) => {
        if (!editingEquipment) return;
        const document = createDocumentMeta(file);
        if (!document) return;
        // Add file object to document so it can be sent to backend
        const documentWithFile = { ...document, file };
        setEquipmentInfo((prev) => ({ ...prev, documents: [...prev.documents, documentWithFile] }));
    };

    const handleEquipmentDocumentRemove = (documentId) => {
        if (!editingEquipment) return;
        setEquipmentInfo((prev) => ({
            ...prev,
            documents: prev.documents.filter((doc) => doc.id !== documentId)
        }));
    };

    const handleEditEquipment = () => {
        setEditingEquipment(true);
        // Store current state as pending changes for cancel
        setPendingEquipmentChanges({
            ...equipmentInfo,
            documents: equipmentInfo.documents.map(doc => ({ ...doc }))
        });
    };

    const handleSaveEquipment = async () => {
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
            // Time format validation (HH:MM)
            const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timePattern.test(equipmentInfo.timeAfterFive)) {
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
                    console.log('Fetched equipment data after save:', updatedEquipmentData);
                    console.log('Documents from backend:', updatedEquipmentData.documents);
                    
                    // Map backend response to frontend format with documents
                    const mappedDocuments = (updatedEquipmentData.documents || []).map((doc) => {
                        // Use doc.id as the primary id, fallback to generated id if missing
                        const docId = doc.id ? `doc-${doc.id}` : `doc-${Date.now()}-${Math.random()}`;
                        const mappedDoc = {
                            id: docId,
                            name: doc.file_name || doc.name || 'Unknown',
                            size: doc.size || 0,
                            type: doc.file_name?.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
                            uploadedAt: doc.created_at || doc.uploaded_at || new Date().toISOString(),
                            backendId: doc.id, // Store backend ID separately
                            filePath: doc.file_path
                        };
                        console.log('Mapped document:', mappedDoc);
                        return mappedDoc;
                    });
                    
                    console.log('Mapped documents array:', mappedDocuments);
                    
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
                    console.warn('No equipment data returned after save');
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
    };

    const handleCancelEquipment = () => {
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
            // Collapse the equipment section (step 5)
            setExpandedStep(expandedStep === 5 ? null : expandedStep);
        }
    };

    const handleDeleteEquipment = async () => {
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
    };

    const fetchEquipmentData = async () => {
        if (!selectedJobId) return;
        
        try {
            // Get equipment time by job_no (backend endpoint: GET /equipment-time/get/{job_no})
            const equipmentData = await equipmentTimeAPI.getJobEquipmentTime(selectedJobId);
            
            if (equipmentData) {
                // Map backend response to frontend format
                // Backend returns: { id, job_no, laptop_used, pip_used, exhibit_tech, 
                //                  parking_cost, time_after, documents: [...] }
                setEquipmentInfo({
                    laptopUsed: equipmentData.laptop_used ?? false,
                    pipUsed: equipmentData.pip_used ?? false,
                    exhibitTech: equipmentData.exhibit_tech ?? false,
                    parkingCost: equipmentData.parking_cost ? String(equipmentData.parking_cost) : '',
                    timeAfterFive: equipmentData.time_after ?? '',
                    documents: (equipmentData.documents || []).map((doc) => ({
                        id: doc.id || `doc-${doc.id}-${Date.now()}`,
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
                setEquipmentInfo({
                    laptopUsed: false,
                    pipUsed: false,
                    exhibitTech: false,
                    parkingCost: '',
                    timeAfterFive: '',
                    documents: []
                });
                setEquipmentTimeId(null);
                setEquipmentHasBeenSaved(false);
                setEditingEquipment(true); // Show Save/Cancel buttons when no equipment exists
                setPendingEquipmentChanges({
                    laptopUsed: false,
                    pipUsed: false,
                    exhibitTech: false,
                    parkingCost: '',
                    timeAfterFive: '',
                    documents: []
                });
            }
        } catch (err) {
            // Only log actual errors (not 404s/500s, which are handled in the API)
            // This catch block handles unexpected errors like network failures
            if (err?.status !== 404 && err?.status !== 500) {
                console.error('Unexpected error fetching equipment time data:', err);
            }
            // Show empty form with Save/Cancel buttons on error
            setEquipmentInfo({
                laptopUsed: false,
                pipUsed: false,
                exhibitTech: false,
                parkingCost: '',
                timeAfterFive: '',
                documents: []
            });
            setEquipmentTimeId(null);
            setEquipmentHasBeenSaved(false);
            setEditingEquipment(true); // Show Save/Cancel buttons when no equipment exists
            setPendingEquipmentChanges({
                laptopUsed: false,
                pipUsed: false,
                exhibitTech: false,
                parkingCost: '',
                timeAfterFive: '',
                documents: []
            });
        }
    };

    // Mock task data
    const task = {
        id: params.id,
        title: 'Federal Deposition – Daniels v. IRS',
        location: '123 Legal Ave, Room 302',
        time: '10:00 AM'
    };

    const steps = [
        { number: 1, title: 'Case Details', done: false },
        { number: 2, title: 'Witness Management', done: false },
        { number: 3, title: 'Attorney Orders', done: false },
        { number: 4, title: 'Billing Information', done: false },
        { number: 5, title: 'Equipment & Time', done: false }
    ];

    const fetchBillingData = async () => {
        if (!selectedJobId) return;
        
        try {
            // Get billing by job_no (backend endpoint: GET /billings/get/{job_no})
            const billingData = await billingAPI.getJobBilling(selectedJobId);
            
            if (billingData && billingData.id) {
                // Billing exists - map backend response to frontend format
                // Backend returns: { id, job_no, cancel_en_route, cancel_setup, billing_notes, 
                //                  videographer_hours_present, file_hours_length, documents: [...] }
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
                setBillingInfo({
                    cancelEnRoute: false,
                    cancelSetup: false,
                    notes: '',
                    videographerHours: '',
                    fileLengthHours: '',
                    documents: []
                });
                setBillingId(null);
                setBillingHasBeenSaved(false);
                setEditingBilling(true); // Show Save/Cancel buttons when no billing exists
                setPendingBillingChanges({
                    cancelEnRoute: false,
                    cancelSetup: false,
                    notes: '',
                    videographerHours: '',
                    fileLengthHours: '',
                    documents: []
                });
            }
        } catch (err) {
            // Only log actual errors (not 404s, which are handled in the API)
            // This catch block handles unexpected errors like network failures
            console.error('Unexpected error fetching billing data:', err);
            // Show empty form with Save/Cancel buttons on error
            setBillingInfo({
                cancelEnRoute: false,
                cancelSetup: false,
                notes: '',
                videographerHours: '',
                fileLengthHours: '',
                documents: []
            });
            setBillingId(null);
            setBillingHasBeenSaved(false);
            setEditingBilling(true); // Show Save/Cancel buttons when no billing exists
            setPendingBillingChanges({
                cancelEnRoute: false,
                cancelSetup: false,
                notes: '',
                videographerHours: '',
                fileLengthHours: '',
                documents: []
            });
        }
    };

    // Fetch billing data on initial load
    useEffect(() => {
        if (!selectedJobId) return;
        fetchBillingData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedJobId]);

    const toggleStep = (stepNumber) => {
        const isExpanding = expandedStep !== stepNumber;
        setExpandedStep(expandedStep === stepNumber ? null : stepNumber);
        
        // Auto-expand first attorney when Attorney Orders section is opened for the first time
        if (stepNumber === 3 && isExpanding && !expandedAttorney && attorneySections.length > 0) {
            setExpandedAttorney(attorneySections[0].id);
        }
        
        // Fetch billing data when Billing section is opened (if not already loaded)
        // This will set the appropriate state (edit mode for new, view mode for existing)
        if (stepNumber === 4 && isExpanding && selectedJobId && !billingId) {
            // Fetch billing data - it will set edit mode if no billing exists
            fetchBillingData();
        } else if (stepNumber === 4 && isExpanding && !selectedJobId && !billingId) {
            // If no jobId but section is opening, show empty form with Save/Cancel
            setEditingBilling(true);
            setPendingBillingChanges({
                ...billingInfo,
                documents: billingInfo.documents.map(doc => ({ ...doc }))
            });
        }
        
        // Auto-enable edit mode when Equipment section is first opened
        if (stepNumber === 5 && isExpanding && !equipmentHasBeenSaved) {
            setEditingEquipment(true);
            setPendingEquipmentChanges({
                ...equipmentInfo,
                documents: equipmentInfo.documents.map(doc => ({ ...doc }))
            });
        }
        
        // Fetch equipment data when Equipment section is opened (if not already loaded)
        if (stepNumber === 5 && isExpanding && selectedJobId && !equipmentTimeId && equipmentHasBeenSaved === false) {
            fetchEquipmentData();
        }
    };

    const toggleStepDone = (stepNumber) => {
        // If marking step 3 (Attorney Orders) as done, validate all attorney forms first
        if (stepNumber === 3 && !completedSteps.includes(stepNumber)) {
            // Check if there are any attorneys
            if (attorneySections.length === 0) {
                toast.error('Please add at least one attorney before marking as done');
                return;
            }
            
            // Check if all attorney sections are complete
            const isSectionValid = (section) => {
                return (
                    section.fields.attorneyName?.trim() &&
                    section.fields.firmName?.trim() &&
                    section.fields.notes?.trim() &&
                    section.fields.orderDetails?.trim()
                );
            };
            
            const incompleteSections = attorneySections.filter(section => !isSectionValid(section));
            
            if (incompleteSections.length > 0) {
                // Get display names for incomplete sections
                const incompleteNames = incompleteSections.map(section => {
                    return section.fields.attorneyName?.trim() || section.title;
                });
                
                const message = incompleteSections.length === 1
                    ? `Please complete "${incompleteNames[0]}" form before marking as done`
                    : `Please complete all incomplete forms (${incompleteNames.join(', ')}) before marking as done`;
                
                toast.error(message);
                return;
            }
        }
        
        if (completedSteps.includes(stepNumber)) {
            setCompletedSteps(completedSteps.filter(s => s !== stepNumber));
        } else {
            setCompletedSteps([...completedSteps, stepNumber]);
        }
    };

    const handleAddWitness = async () => {
        const name = newWitnessName.trim();
        if (!name) return;
        try {
            const jobIdParam = searchParams.get('jobId');
            const jobId = Number(jobIdParam ?? params?.id);
            const payload = { job_no: jobId, witness_name: name };
            const created = await witnessesAPI.createJObWitness(payload);
            const newId = created?.id ?? created?.witness_id ?? Date.now();
            const newWitness = { id: newId, name: created?.name ?? created?.witness_name ?? name };
            setWitnesses((prev) => [...prev, newWitness]);
            setWitnessRecords((prev) => ({ ...prev, [newId]: prev[newId] ?? [] }));
            
            // Get default template from first existing witness or use API response
            setWitnessTemplates((prev) => {
                // First, try to get template from API response
                const apiTemplate = {
                    readOnText: created?.read_on_text ?? created?.readOnText,
                    readOnTime: created?.read_on_time ?? created?.readOnTime,
                    readOffText: created?.read_off_text ?? created?.readOffText,
                    readOffTime: created?.read_off_time ?? created?.readOffTime,
                };
                
                // If API has template data, use it
                if (apiTemplate.readOnText || apiTemplate.readOffText) {
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
    };

    const handleRenameWitness = async (witnessId, newName) => {
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
    };

    const handleDeleteWitness = async (witnessId) => {
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
    };

    const handleAddRecord = (witnessId) => {
        const current = witnessRecords[witnessId] || [];
        if (current.length >= 5) {
            toast.error('You can add maximum 5 videos (no more than 5).');
            return;
        }
        setWitnessRecords({
            ...witnessRecords,
            [witnessId]: [
                ...current,
                { id: Date.now(), startTime: '', endTime: '', video: null }
            ]
        });
    };

    const handleUpdateRecord = (witnessId, recordId, field, value) => {
        setWitnessRecords((prev) => ({
            ...prev,
            [witnessId]: (prev[witnessId] || []).map((r) =>
                r.id === recordId ? { ...r, [field]: value } : r
            )
        }));
    };

    const handleUploadVideo = async (witnessId, recordId, file) => {
        // allow removing selected video
        if (!file) {
            // File trash should NOT remove the whole Part section.
            // If this was an existing backend video, mark it for deletion,
            // clear the backendId so it won't be "kept" in replace_videos mode,
            // and clear the file so user can re-upload a replacement.
            const record = (witnessRecords[witnessId] || []).find((r) => r.id === recordId);
            const backendId = record?.backendId;
            if (backendId) {
                setDeletedWitnessVideoIds((prev) => ({
                    ...prev,
                    [witnessId]: Array.from(new Set([...(prev[witnessId] || []), backendId])),
                }));
                setWitnessRecords((prev) => ({
                    ...prev,
                    [witnessId]: (prev[witnessId] || []).map((r) =>
                        r.id === recordId ? { ...r, backendId: undefined, videoId: undefined, video: null } : r
                    ),
                }));
                return;
            }
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
    };

    const handleSaveWitness = async (witnessId, { template, records } = {}) => {
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
            
            toast.success('Witness + videos saved successfully');
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
    };

    const handleDeleteRecord = (witnessId, recordId) => {
        // If record exists in DB, mark it for deletion in save-all payload
        const record = (witnessRecords[witnessId] || []).find((r) => r.id === recordId);
        const backendId = record?.backendId;
        if (backendId) {
            setDeletedWitnessVideoIds((prev) => ({
                ...prev,
                [witnessId]: Array.from(new Set([...(prev[witnessId] || []), backendId])),
            }));
        }
        setWitnessRecords((prev) => ({
            ...prev,
            [witnessId]: (prev[witnessId] || []).filter((r) => r.id !== recordId),
        }));
    };

    const handleUpdateTemplate = (witnessId, field, value) => {
        setWitnessTemplates({
            ...witnessTemplates,
            [witnessId]: {
                ...witnessTemplates[witnessId],
                [field]: value
            }
        });
    };


    const progress = Math.round((completedSteps.length / steps.length) * 100);

    return (
        <>
            {/* Header is provided globally via `Header` in `LayoutWrapper` */}

            {/* Main Content */}
            <div className="flex h-[calc(100vh-73px)]">
                {/* Left Panel - Task Info */}
                <div className="w-full md:w-96 bg-white border-r border-gray-200 p-6 overflow-y-auto">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-4">
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg">
                            Scheduled
                        </span>
                        <button className="p-1 hover:bg-gray-100 rounded">
                            <MoreVertical className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    {/* Task Title */}
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        {task.title}
                    </h2>

                    {/* Location and Time */}
                    <div className="space-y-3 mb-6">
                        {task.location && (
                            <div className="flex items-center gap-2 text-gray-600">
                                <MapPin className="w-5 h-5" />
                                <span className="text-sm">{task.location}</span>
                            </div>
                        )}
                        {task.platform && (
                            <div className="flex items-center gap-2 text-blue-600">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 14.47l-5.894 3.4-5.894-3.4V9.53l5.894-3.4 5.894 3.4v4.94z" />
                                </svg>
                                <span className="text-sm">{task.platform}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="w-5 h-5" />
                            <span className="text-sm">Today, {task.time}</span>
                        </div>
                    </div>

                    {/* Start Session Button */}
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors mb-6">
                        Start Session
                    </button>
                </div>

                {/* Right Panel - Case Progress */}
                <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
                    {/* Progress Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Case Progress</h3>
                        <span className="text-sm font-medium text-gray-600">{progress}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
                        <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                    </div>

                    {/* Case Steps */}
                    <div className="space-y-3">
                        {steps.map((step) => (
                            <div
                                key={step.number}
                                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors"
                            >
                                {/* Step Header */}
                                <div
                                    onClick={() => toggleStep(step.number)}
                                    className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                    <h4 className="text-base font-medium text-gray-900">
                                        {step.number}. {step.title}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleStepDone(step.number);
                                            }}
                                            className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${
                                                completedSteps.includes(step.number)
                                                    ? 'bg-green-50 text-green-600'
                                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                            }`}
                                        >
                                            {completedSteps.includes(step.number) ? 'Done' : 'Mark as Done'}
                                        </button>
                                        {expandedStep === step.number ? (
                                            <ChevronUp className="w-5 h-5 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                </div>

                                {/* Step Content - Expandable */}
                                {expandedStep === step.number && (
                                    <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                                        {step.number === 1 && (
                                            <CaseDetails 
                                                formData={formData} 
                                                editingCase={editingCase}
                                                handleEditCase={handleEditCase}
                                                handleSaveCase={handleSaveCase}
                                                handleCancelCase={handleCancelCase}
                                            />
                                        )}
                                        {step.number === 2 && (
                                            <WitnessManagement
                                                witnesses={witnesses}
                                                addingWitness={addingWitness}
                                                newWitnessName={newWitnessName}
                                                setAddingWitness={setAddingWitness}
                                                setNewWitnessName={setNewWitnessName}
                                                expandedWitness={expandedWitness}
                                                setExpandedWitness={setExpandedWitness}
                                                witnessRecords={witnessRecords}
                                                witnessTemplates={witnessTemplates}
                                                handleAddWitness={handleAddWitness}
                                                handleDeleteWitness={handleDeleteWitness}
                                                handleAddRecord={handleAddRecord}
                                                handleUpdateRecord={handleUpdateRecord}
                                                handleUploadVideo={handleUploadVideo}
                                                handleDeleteRecord={handleDeleteRecord}
                                                handleUpdateTemplate={handleUpdateTemplate}
                                                handleRenameWitness={handleRenameWitness}
                                                toast={toast}
                                                onSaveWitness={handleSaveWitness}
                                            />
                                        )}
                                        {step.number === 3 && (
                                            <AttorneyOrders
                                                attorneySections={attorneySections}
                                                handleAddAttorneySection={handleAddAttorneySection}
                                                handleRemoveAttorneySection={handleRemoveAttorneySection}
                                                handleAttorneyFieldChange={handleAttorneyFieldChange}
                                                handleAttorneyUpload={handleAttorneyUpload}
                                                handleRemoveAttorneyDocument={handleRemoveAttorneyDocument}
                                                handleSaveAttorney={handleSaveAttorney}
                                                handleCancelAttorney={handleCancelAttorney}
                                                expandedAttorney={expandedAttorney}
                                                setExpandedAttorney={setExpandedAttorney}
                                                editingAttorney={editingAttorney}
                                                setEditingAttorney={setEditingAttorney}
                                            />
                                        )}
                                        {step.number === 4 && (
                                            <BillingInfo
                                                billingInfo={billingInfo}
                                                handleBillingToggle={handleBillingToggle}
                                                handleBillingInputChange={handleBillingInputChange}
                                                handleBillingUpload={handleBillingUpload}
                                                handleBillingDocumentRemove={handleBillingDocumentRemove}
                                                editingBilling={editingBilling}
                                                handleEditBilling={handleEditBilling}
                                                handleSaveBilling={handleSaveBilling}
                                                handleCancelBilling={handleCancelBilling}
                                                handleDeleteBilling={handleDeleteBilling}
                                                billingId={billingId}
                                            />
                                        )}
                                        {step.number === 5 && (
                                            <EquipmentSection
                                                equipmentInfo={equipmentInfo}
                                                handleEquipmentCheckbox={handleEquipmentCheckbox}
                                                handleEquipmentInputChange={handleEquipmentInputChange}
                                                handleEquipmentUpload={handleEquipmentUpload}
                                                handleEquipmentDocumentRemove={handleEquipmentDocumentRemove}
                                                editingEquipment={editingEquipment}
                                                handleEditEquipment={handleEditEquipment}
                                                handleSaveEquipment={handleSaveEquipment}
                                                handleCancelEquipment={handleCancelEquipment}
                                                handleDeleteEquipment={handleDeleteEquipment}
                                                equipmentTimeId={equipmentTimeId}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
