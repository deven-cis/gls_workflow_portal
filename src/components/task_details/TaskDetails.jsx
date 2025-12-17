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
    const lastSavedRef = useRef({ caseName: '', caseNumber: '' })
    const [witnesses, setWitnesses] = useState([]);
    const [addingWitness, setAddingWitness] = useState(false);
    const [newWitnessName, setNewWitnessName] = useState('');
    const [expandedWitness, setExpandedWitness] = useState(null);
    const [witnessRecords, setWitnessRecords] = useState({});
    const [witnessTemplates, setWitnessTemplates] = useState({});
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
  
    const handleCaseFormChange = (next) => {
        setFormData(next);
        // only mark dirty if different from last saved snapshot
        const prev = lastSavedRef.current;
        if (next.caseName !== prev.caseName || next.caseNumber !== prev.caseNumber) {
        setIsCaseEdited(true);
        }
    };

    // autosave with dedupe + longer debounce (e.g., 2500ms)
    useEffect(() => {
        if (!caseId || !isCaseEdited) return;
    
            const payload = {
            case_short_name: formData.caseName ?? '',
            case_number: formData.caseNumber ?? ''
        };
    
        // already saved? skip
        if (
            payload.case_short_name === lastSavedRef.current.caseName &&
            payload.case_number === lastSavedRef.current.caseNumber
        ) {
            setIsCaseEdited(false);
            return;
        }
    
        const timer = setTimeout(async () => {
        try {
            await taskAPI.editCase(caseId, payload);
            lastSavedRef.current = {
            caseName: payload.case_short_name,
            caseNumber: payload.case_number
            };
            setIsCaseEdited(false);
        } catch (err) {
            console.error('Failed to update case', err);
        }
        }, 2500); // adjust to 2000–3000ms as you prefer
    
        return () => clearTimeout(timer);
    }, [caseId, isCaseEdited, formData.caseName, formData.caseNumber]);


    const [billingInfo, setBillingInfo] = useState({
        cancelEnRoute: true,
        cancelSetup: true,
        notes: '',
        videographerHours: '',
        fileLengthHours: '',
        documents: []
    });
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
            setAttorneySections((prev) => prev.filter((s) => s.id !== sectionId));
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
        setBillingInfo((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    const handleBillingInputChange = (field, value) => {
        setBillingInfo((prev) => ({ ...prev, [field]: value }));
    };

    const handleBillingUpload = (file) => {
        const document = createDocumentMeta(file);
        if (!document) return;
        setBillingInfo((prev) => ({ ...prev, documents: [...prev.documents, document] }));
    };

    const handleBillingDocumentRemove = (documentId) => {
        setBillingInfo((prev) => ({
            ...prev,
            documents: prev.documents.filter((doc) => doc.id !== documentId)
        }));
    };

    const handleEquipmentCheckbox = (field) => {
        setEquipmentInfo((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    const handleEquipmentInputChange = (field, value) => {
        setEquipmentInfo((prev) => ({ ...prev, [field]: value }));
    };

    const handleEquipmentUpload = (file) => {
        const document = createDocumentMeta(file);
        if (!document) return;
        setEquipmentInfo((prev) => ({ ...prev, documents: [...prev.documents, document] }));
    };

    const handleEquipmentDocumentRemove = (documentId) => {
        setEquipmentInfo((prev) => ({
            ...prev,
            documents: prev.documents.filter((doc) => doc.id !== documentId)
        }));
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

    const toggleStep = (stepNumber) => {
        const isExpanding = expandedStep !== stepNumber;
        setExpandedStep(expandedStep === stepNumber ? null : stepNumber);
        
        // Auto-expand first attorney when Attorney Orders section is opened for the first time
        if (stepNumber === 3 && isExpanding && !expandedAttorney && attorneySections.length > 0) {
            setExpandedAttorney(attorneySections[0].id);
        }
    };

    const toggleStepDone = (stepNumber) => {
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
        }
    };

    const handleDeleteWitness = (witnessId) => {
        setWitnesses(witnesses.filter(w => w.id !== witnessId));
        const newRecords = { ...witnessRecords };
        delete newRecords[witnessId];
        setWitnessRecords(newRecords);
        const newTemplates = { ...witnessTemplates };
        delete newTemplates[witnessId];
        setWitnessTemplates(newTemplates);
        setExpandedWitness(null);
    };

    const handleAddRecord = (witnessId) => {
        setWitnessRecords({
            ...witnessRecords,
            [witnessId]: [
                ...witnessRecords[witnessId],
                { id: Date.now(), startTime: '', endTime: '', video: null }
            ]
        });
    };

    const handleUpdateRecord = (witnessId, recordId, field, value) => {
        setWitnessRecords({
            ...witnessRecords,
            [witnessId]: witnessRecords[witnessId].map(r =>
                r.id === recordId ? { ...r, [field]: value } : r
            )
        });
    };

    const handleUploadVideo = (witnessId, recordId, file) => {
        if (!file) return;
        handleUpdateRecord(witnessId, recordId, 'video', {
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString()
        });
    };

    const handleDeleteRecord = (witnessId, recordId) => {
        setWitnessRecords({
            ...witnessRecords,
            [witnessId]: witnessRecords[witnessId].filter(r => r.id !== recordId)
        });
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
                                            <CaseDetails formData={formData} onChange={handleCaseFormChange} />
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
                                            />
                                        )}
                                        {step.number === 5 && (
                                            <EquipmentSection
                                                equipmentInfo={equipmentInfo}
                                                handleEquipmentCheckbox={handleEquipmentCheckbox}
                                                handleEquipmentInputChange={handleEquipmentInputChange}
                                                handleEquipmentUpload={handleEquipmentUpload}
                                                handleEquipmentDocumentRemove={handleEquipmentDocumentRemove}
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
