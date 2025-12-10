"use client";
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

export default function TaskDetails({ taskId }) {
    const params = useParams();
    console.log('TaskDetails page mounted with params:', taskId);
    const router = useRouter();
    const [expandedStep, setExpandedStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState([]);
    const [formData, setFormData] = useState({
        caseName: 'Johnson vs. Smith Deposition',
        caseNumber: '72364'
    });
    const [witnesses, setWitnesses] = useState([]);
    const [addingWitness, setAddingWitness] = useState(false);
    const [newWitnessName, setNewWitnessName] = useState('');
    const [expandedWitness, setExpandedWitness] = useState(null);
    const [witnessRecords, setWitnessRecords] = useState({});
    const [witnessTemplates, setWitnessTemplates] = useState({});
    const [attorneySections, setAttorneySections] = useState([
        createAttorneySection('Taking Attorney')
    ]);
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
            type: file.type
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
        const newDoc = {
            id: `${sectionId}-${Date.now()}`,
            name: file.name,
            size: file.size,
            type: file.type
        };
        setAttorneySections((prev) =>
            prev.map((section) =>
                section.id === sectionId
                    ? { ...section, documents: [...section.documents, newDoc] }
                    : section
            )
        );
    };

    const handleRemoveAttorneyDocument = (sectionId, documentId) => {
        setAttorneySections((prev) =>
            prev.map((section) =>
                section.id === sectionId
                    ? {
                          ...section,
                          documents: section.documents.filter((doc) => doc.id !== documentId)
                      }
                    : section
            )
        );
    };

    const handleAddAttorneySection = () => {
        setAttorneySections((prev) => {
            const hasCopy = prev.some((section) => section.title === 'Copy of Attorney');
            const numberedCount = prev.filter((section) => /^Attorney\s\d+$/i.test(section.title)).length;
            const title = hasCopy ? `Attorney ${numberedCount + 1}` : 'Copy of Attorney';
            return [...prev, createAttorneySection(title)];
        });
    };

    const handleRemoveAttorneySection = (sectionId) => {
        setAttorneySections((prev) => prev.filter((section) => section.id !== sectionId));
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
        setExpandedStep(expandedStep === stepNumber ? null : stepNumber);
    };

    const toggleStepDone = (stepNumber) => {
        if (completedSteps.includes(stepNumber)) {
            setCompletedSteps(completedSteps.filter(s => s !== stepNumber));
        } else {
            setCompletedSteps([...completedSteps, stepNumber]);
        }
    };

    const handleAddWitness = () => {
        if (newWitnessName.trim()) {
            const witnessId = Date.now();
            setWitnesses([...witnesses, { id: witnessId, name: newWitnessName }]);
            setWitnessRecords({ ...witnessRecords, [witnessId]: [] });
            setWitnessTemplates({
                ...witnessTemplates,
                [witnessId]: {
                    readOnText: '',
                    readOnTime: '',
                    readOffText: '',
                    readOffTime: ''
                }
            });
            setNewWitnessName('');
            setAddingWitness(false);
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
                                            <CaseDetails formData={formData} onChange={setFormData} />
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
