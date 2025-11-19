"use client";
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Clock, MoreVertical, ChevronDown, ChevronUp, LogOut, Trash2, Clock as ClockIcon, Check, Search } from 'lucide-react';

const createAttorneySection = (title) => ({
    id: `${title.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 9)}`,
    title,
    fields: {
        attorneyName: '',
        firmName: '',
        notes: '',
        orderDetails: ''
    },
    documents: []
});

const getInitials = (name = '') => {
    const [first = '', second = ''] = name.split(' ');
    return `${first.charAt(0)}${second.charAt(0)}`.trim().toUpperCase() || first.charAt(0).toUpperCase();
};

export default function TaskDetails() {
    const params = useParams();
    const router = useRouter();
    const [expandedStep, setExpandedStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState([]);
    const [showLogoutMenu, setShowLogoutMenu] = useState(false);
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

    const TimeInput = ({ value, onChange }) => (
        <input
            type="time"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
    );

    const AddActionButton = ({ label, onClick }) => (
        <button
            type="button"
            onClick={onClick}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors text-left"
        >
            <span className="text-lg text-blue-600">+</span>
            <span>{label}</span>
        </button>
    );

    const ToggleOption = ({ label, description, value, onChange }) => (
        <button
            type="button"
            onClick={onChange}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                value ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
        >
            <span
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
                    value ? 'bg-blue-600' : 'bg-gray-300'
                }`}
            >
                <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                        value ? 'translate-x-5' : 'translate-x-1'
                    }`}
                />
            </span>
            <div>
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{description}</p>
            </div>
        </button>
    );

    const CheckboxOption = ({ label, description, checked, onChange }) => (
        <button
            type="button"
            onClick={onChange}
            className={`flex h-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                checked ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
        >
            <span
                className={`flex h-5 w-5 items-center justify-center rounded border ${
                    checked ? 'border-blue-500 bg-blue-600 text-white' : 'border-gray-300 bg-white text-transparent'
                }`}
            >
                <Check className="h-3 w-3" />
            </span>
            <div>
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{description}</p>
            </div>
        </button>
    );

    const IconInput = ({ label, placeholder, value, onChange, type = 'text', icon: IconComponent, prefix }) => (
        <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
            <div className="relative">
                {prefix && (
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                        {prefix}
                    </span>
                )}
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                        prefix ? 'pl-8' : ''
                    } ${IconComponent ? 'pr-10' : ''}`}
                />
                {IconComponent && (
                    <IconComponent className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                )}
            </div>
        </div>
    );

    const DocumentUpload = ({
        title,
        description,
        buttonLabel = 'Upload',
        accept,
        onUpload,
        documents = [],
        onRemoveDocument
    }) => (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-300 text-blue-500">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a4 4 0 010 8h-1m-4-4v10m0 0l-3-3m3 3l3-3" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{title}</p>
                        <p className="text-xs text-gray-500">{description}</p>
                    </div>
                </div>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-white">
                    {buttonLabel}
                    <input
                        type="file"
                        accept={accept}
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files?.[0]) {
                                onUpload(e.target.files[0]);
                                e.target.value = '';
                            }
                        }}
                    />
                </label>
            </div>
            {documents.length > 0 && (
                <div className="mt-4 space-y-3">
                    {documents.map((document) => {
                        const extension = document.name.split('.').pop()?.toUpperCase() || 'DOC';
                        return (
                            <div key={document.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-sm font-semibold text-red-600">
                                    {extension}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{document.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {(document.size / (1024 * 1024)).toFixed(1)} MB · Complete
                                    </p>
                                </div>
                                {onRemoveDocument && (
                                    <button
                                        type="button"
                                        onClick={() => onRemoveDocument(document.id)}
                                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                        aria-label="Delete document"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

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

    const handleLogout = () => {
        setShowLogoutMenu(false);
        router.push('/');
    };

    const progress = Math.round((completedSteps.length / steps.length) * 100);

    const handleBack = () => {
        router.push(`/dashboard/my_tasks`);
    };

    return (
        <>
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="px-4 md:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleBack}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <h1 className="text-lg md:text-xl font-bold text-gray-900">
                            Task Details
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">Sep 24, 2025</span>
                        <span className="text-sm font-medium text-gray-900">10:00 AM</span>
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => setShowLogoutMenu(!showLogoutMenu)}
                                className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm hover:shadow-lg transition-shadow"
                            >
                                JK
                            </button>
                            {showLogoutMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowLogoutMenu(false)} />
                                    <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                                        >
                                            <LogOut className="w-4 h-4 text-red-600" />
                                            <span className="text-red-600">Logout</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

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

                    {/* Assignee */}
                    <div className="mb-6 space-y-2">
                        <label className="text-sm font-semibold text-gray-900">
                            Assignee
                        </label>
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                                    {getInitials(assignee.name)}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        {assignee.name} <span className="text-gray-500">(me)</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-100 transition-colors"
                                aria-label="Search assignee"
                            >
                                <Search className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Collaborators */}
                    <div className="mb-6 space-y-3">
                        <label className="text-sm font-semibold text-gray-900">
                            Collaborators
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={collaboratorSearch}
                                onChange={(e) => setCollaboratorSearch(e.target.value)}
                                placeholder="Add Collaborator"
                                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
                            />
                            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        </div>
                        <div className="space-y-3">
                            {collaboratorsList.map((collaborator) => (
                                <div key={collaborator.id} className="flex items-center gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                                            {getInitials(collaborator.name)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{collaborator.name}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Activity */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-gray-900">
                            Activity
                        </label>
                        <div className="space-y-2 text-sm">
                            {activityTimeline.map((activity) => (
                                <div key={activity.label} className="flex items-center justify-between">
                                    <button type="button" className="text-blue-600 hover:underline">
                                        {activity.label}
                                    </button>
                                    <span className="text-gray-500">{activity.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>
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
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Case Name <span className="text-red-600">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={formData.caseName}
                                                        onChange={(e) => setFormData({ ...formData, caseName: e.target.value })}
                                                        className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md focus:border-gray-300 outline-none"
                                                        placeholder="Johnson vs. Smith Deposition"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Case Number <span className="text-red-600">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={formData.caseNumber}
                                                        onChange={(e) => setFormData({ ...formData, caseNumber: e.target.value })}
                                                        className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md focus:border-gray-300 outline-none"
                                                        placeholder="72364"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {step.number === 2 && (
                                            <div className="space-y-4">
                                                {/* Witnesses List */}
                                                {witnesses.length > 0 && (
                                                    <div className="space-y-3">
                                                        {witnesses.map((witness) => (
                                                            <div key={witness.id} className="border border-gray-300 rounded-lg overflow-hidden">
                                                                {/* Witness Header */}
                                                                <div
                                                                    onClick={() => setExpandedWitness(expandedWitness === witness.id ? null : witness.id)}
                                                                    className="p-4 bg-white cursor-pointer flex items-center justify-between hover:bg-gray-50 transition-colors"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-sm font-medium text-gray-900">{witness.name}</span>
                                                                        <span className="text-xs text-gray-500">02:45:00</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDeleteWitness(witness.id);
                                                                            }}
                                                                            className="p-1 hover:bg-red-50 rounded transition-colors"
                                                                        >
                                                                            <Trash2 className="w-4 h-4 text-red-600" />
                                                                        </button>
                                                                        <button className="text-blue-600 hover:text-blue-700 text-xs font-medium">Download complete video</button>
                                                                        {expandedWitness === witness.id ? (
                                                                            <ChevronUp className="w-5 h-5 text-gray-400" />
                                                                        ) : (
                                                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Witness Details - Expandable */}
                                                                {expandedWitness === witness.id && (
                                                                    <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-6">
                                                                        {/* Read on/off Template Section */}
                                                                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                                                                            <h5 className="text-sm font-semibold text-gray-900 mb-4">Read on/off Template</h5>
                                                                            
                                                                            {/* Read on Text */}
                                                                            <div className="mb-4">
                                                                                <label className="block text-xs font-medium text-gray-700 mb-2">Read on text</label>
                                                                                <textarea
                                                                                    value={witnessTemplates[witness.id]?.readOnText || ''}
                                                                                    onChange={(e) => handleUpdateTemplate(witness.id, 'readOnText', e.target.value)}
                                                                                    className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                                    rows="3"
                                                                                    placeholder="We are now on the record at [TIME] on [DATE]. This is the [TYPE] deposition of [WITNESS NAME] in the matter of [CASE NAME], case number [CASE NUMBER]."
                                                                                />
                                                                            </div>

                                                                            {/* Read on Time */}
                                                                            <div className="mb-4">
                                                                                <label className="block text-xs font-medium text-gray-700 mb-2">Read on time</label>
                                                                                <TimeInput
                                                                                    value={witnessTemplates[witness.id]?.readOnTime}
                                                                                    onChange={(newValue) => handleUpdateTemplate(witness.id, 'readOnTime', newValue)}
                                                                                />
                                                                            </div>

                                                                            {/* Read off Text */}
                                                                            <div className="mb-4">
                                                                                <label className="block text-xs font-medium text-gray-700 mb-2">Read off text</label>
                                                                                <textarea
                                                                                    value={witnessTemplates[witness.id]?.readOffText || ''}
                                                                                    onChange={(e) => handleUpdateTemplate(witness.id, 'readOffText', e.target.value)}
                                                                                    className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                                    rows="3"
                                                                                    placeholder="We are now off the record at [TIME]. This concludes the deposition of [WITNESS NAME]."
                                                                                />
                                                                            </div>

                                                                            {/* Read off Time */}
                                                                            <div>
                                                                                <label className="block text-xs font-medium text-gray-700 mb-2">Read off time</label>
                                                                                <TimeInput
                                                                                    value={witnessTemplates[witness.id]?.readOffTime}
                                                                                    onChange={(newValue) => handleUpdateTemplate(witness.id, 'readOffTime', newValue)}
                                                                                />
                                                                            </div>
                                                                        </div>

                                                                        {/* Records Section */}
                                                                        {witnessRecords[witness.id]?.map((record, idx) => (
                                                                            <div key={record.id} className="bg-white p-4 rounded-lg border border-gray-200">
                                                                                <div className="flex items-center justify-between mb-4">
                                                                                    <h5 className="text-sm font-semibold text-gray-900">New Record</h5>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleDeleteRecord(witness.id, record.id)}
                                                                                        className="p-2 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                                                        aria-label="Delete record"
                                                                                    >
                                                                                        <Trash2 className="w-4 h-4" />
                                                                                    </button>
                                                                                </div>
                                                                                
                                                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                                                    <div>
                                                                                        <label className="block text-xs font-medium text-gray-700 mb-2">Start Time</label>
                                                                                        <TimeInput
                                                                                            value={record.startTime}
                                                                                            onChange={(newValue) => handleUpdateRecord(witness.id, record.id, 'startTime', newValue)}
                                                                                        />
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="block text-xs font-medium text-gray-700 mb-2">End Time</label>
                                                                                        <TimeInput
                                                                                            value={record.endTime}
                                                                                            onChange={(newValue) => handleUpdateRecord(witness.id, record.id, 'endTime', newValue)}
                                                                                        />
                                                                                    </div>
                                                                                </div>

                                                                                {/* Video Upload */}
                                                                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4 flex flex-wrap items-center justify-between gap-4">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-400">
                                                                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                                    </svg>
                                                                                        </div>
                                                                                        <div>
                                                                                            <p className="text-sm font-medium text-gray-700">Upload Video</p>
                                                                                    <p className="text-xs text-gray-500">MPEG or MP4 formats.</p>
                                                                                            {record.video && (
                                                                                                <p className="text-xs text-gray-600 mt-1">
                                                                                                    {record.video.name}
                                                                                                </p>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                    <label className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                                                                                        Upload
                                                                                        <input
                                                                                            type="file"
                                                                                            accept="video/mpeg,video/mp4"
                                                                                            className="hidden"
                                                                                            onChange={(e) => handleUploadVideo(witness.id, record.id, e.target.files?.[0])}
                                                                                        />
                                                                                    </label>
                                                                                </div>

                                                                                {record.video && (
                                                                                    <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg mb-4">
                                                                                        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                                                                            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm10 12H4v-2h10v2z" />
                                                                                        </svg>
                                                                                        <span className="text-sm text-gray-700">
                                                                                            {record.video.name} ({(record.video.size / (1024 * 1024)).toFixed(1)} MB)
                                                                                        </span>
                                                                                        <span className="text-xs text-green-600 ml-auto">Ready</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}

                                                                        {/* Add Record Button */}
                                                                        <AddActionButton label="Add Record" onClick={() => handleAddRecord(witness.id)} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Add Witness Section */}
                                                {addingWitness ? (
                                                    <div className="border border-blue-400 rounded-lg p-4 bg-blue-50">
                                                        <input
                                                            type="text"
                                                            value={newWitnessName}
                                                            onChange={(e) => setNewWitnessName(e.target.value)}
                                                            placeholder="Enter witness name"
                                                            className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                                                            autoFocus
                                                        />
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setAddingWitness(false);
                                                                    setNewWitnessName('');
                                                                }}
                                                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleAddWitness}
                                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                                            >
                                                                Save
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <AddActionButton label="Add Witness" onClick={() => setAddingWitness(true)} />
                                                )}
                                            </div>
                                        )}
                                        {step.number === 3 && (
                                            <div className="space-y-6">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div>
                                                        <h4 className="text-lg font-semibold text-gray-900">Attorney Orders</h4>
                                                        <p className="text-sm text-gray-500">Document instructions for every attorney involved.</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleAddAttorneySection}
                                                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                                                    >
                                                        <span className="text-lg leading-none">+</span>
                                                        Add Another Attorney
                                                    </button>
                                                </div>

                                                <div className="space-y-6">
                                                    {attorneySections.map((section, index) => (
                                                        <div key={section.id} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                                <div>
                                                                    <p className="text-base font-semibold text-gray-900">{section.title}</p>
                                                                    <p className="text-sm text-gray-500">Provide the attorney’s information and special orders.</p>
                                                                </div>
                                                                {index > 0 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveAttorneySection(section.id)}
                                                                        className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                        Remove
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                                <div>
                                                                    <label className="mb-2 block text-sm font-medium text-gray-700">Attorney Name</label>
                                                                    <input
                                                                        type="text"
                                                                        value={section.fields.attorneyName}
                                                                        onChange={(e) => handleAttorneyFieldChange(section.id, 'attorneyName', e.target.value)}
                                                                        placeholder="Enter attorney name"
                                                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="mb-2 block text-sm font-medium text-gray-700">Firm Name</label>
                                                                    <input
                                                                        type="text"
                                                                        value={section.fields.firmName}
                                                                        onChange={(e) => handleAttorneyFieldChange(section.id, 'firmName', e.target.value)}
                                                                        placeholder="Enter firm name"
                                                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="mb-2 block text-sm font-medium text-gray-700">Notes</label>
                                                                    <textarea
                                                                        rows={3}
                                                                        value={section.fields.notes}
                                                                        onChange={(e) => handleAttorneyFieldChange(section.id, 'notes', e.target.value)}
                                                                        placeholder="Enter any notes"
                                                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="mb-2 block text-sm font-medium text-gray-700">Order Details</label>
                                                                    <textarea
                                                                        rows={3}
                                                                        value={section.fields.orderDetails}
                                                                        onChange={(e) => handleAttorneyFieldChange(section.id, 'orderDetails', e.target.value)}
                                                                        placeholder="Enter order details"
                                                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <DocumentUpload
                                                                title="Upload your business card or drag & drop"
                                                                description="DOCX or PDF formats, up to 5MB."
                                                                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                                                onUpload={(file) => handleAttorneyUpload(section.id, file)}
                                                                documents={section.documents}
                                                                onRemoveDocument={(documentId) => handleRemoveAttorneyDocument(section.id, documentId)}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {step.number === 4 && (
                                            <div className="space-y-6">
                                                <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                                    <div>
                                                        <p className="text-base font-semibold text-gray-900">Billing</p>
                                                        <p className="text-sm text-gray-500">Capture the billing scenario and any related notes.</p>
                                                    </div>
                                                    <div className="grid gap-4 sm:grid-cols-2">
                                                        <ToggleOption
                                                            label="Cancel En Route"
                                                            description="Job canceled while en route."
                                                            value={billingInfo.cancelEnRoute}
                                                            onChange={() => handleBillingToggle('cancelEnRoute')}
                                                        />
                                                        <ToggleOption
                                                            label="Cancel Setup"
                                                            description="Job canceled after setup began."
                                                            value={billingInfo.cancelSetup}
                                                            onChange={() => handleBillingToggle('cancelSetup')}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-2 block text-sm font-medium text-gray-700">Billing Notes</label>
                                                        <textarea
                                                            rows={4}
                                                            value={billingInfo.notes}
                                                            onChange={(e) => handleBillingInputChange('notes', e.target.value)}
                                                            placeholder="Enter any billing notes"
                                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="text-base font-semibold text-gray-900">Videographer Hours</p>
                                                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                                                            <IconInput
                                                                label="Hours videographer was present"
                                                                placeholder="Enter hours"
                                                                value={billingInfo.videographerHours}
                                                                onChange={(value) => handleBillingInputChange('videographerHours', value)}
                                                                type="number"
                                                                icon={Clock}
                                                            />
                                                            <IconInput
                                                                label="Hours length of files"
                                                                placeholder="Enter hours"
                                                                value={billingInfo.fileLengthHours}
                                                                onChange={(value) => handleBillingInputChange('fileLengthHours', value)}
                                                                type="number"
                                                                icon={Clock}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <DocumentUpload
                                                    title="Upload your additional document or drag & drop"
                                                    description="DOCX or PDF formats, up to 5MB."
                                                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                                    onUpload={handleBillingUpload}
                                                    documents={billingInfo.documents}
                                                    onRemoveDocument={handleBillingDocumentRemove}
                                                />
                                            </div>
                                        )}
                                        {step.number === 5 && (
                                            <div className="space-y-6">
                                                <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                                    <div>
                                                        <p className="text-base font-semibold text-gray-900">Equipment & Time</p>
                                                        <p className="text-sm text-gray-500">Track resources used and any overtime costs.</p>
                                                    </div>
                                                    <div className="grid gap-4 md:grid-cols-3">
                                                        <CheckboxOption
                                                            label="Laptop Used"
                                                            description="Select if a laptop was used on-site."
                                                            checked={equipmentInfo.laptopUsed}
                                                            onChange={() => handleEquipmentCheckbox('laptopUsed')}
                                                        />
                                                        <CheckboxOption
                                                            label="PIP Used"
                                                            description="Select if Picture-in-Picture was used."
                                                            checked={equipmentInfo.pipUsed}
                                                            onChange={() => handleEquipmentCheckbox('pipUsed')}
                                                        />
                                                        <CheckboxOption
                                                            label="Exhibit Tech"
                                                            description="Select if Exhibit Techmode was demonstrated."
                                                            checked={equipmentInfo.exhibitTech}
                                                            onChange={() => handleEquipmentCheckbox('exhibitTech')}
                                                        />
                                                    </div>
                                                    <div className="grid gap-4 md:grid-cols-2">
                                                        <IconInput
                                                            label="Parking Cost"
                                                            placeholder="Enter parking cost"
                                                            value={equipmentInfo.parkingCost}
                                                            onChange={(value) => handleEquipmentInputChange('parkingCost', value)}
                                                            type="number"
                                                            prefix="$"
                                                        />
                                                        <IconInput
                                                            label="Time After 5PM (hrs)"
                                                            placeholder="Enter hrs"
                                                            value={equipmentInfo.timeAfterFive}
                                                            onChange={(value) => handleEquipmentInputChange('timeAfterFive', value)}
                                                            type="number"
                                                            icon={Clock}
                                                        />
                                                    </div>
                                                </div>
                                                <DocumentUpload
                                                    title="Upload Your Parking Receipt or drag & drop"
                                                    description="DOCX or PDF formats, up to 5MB."
                                                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                                    onUpload={handleEquipmentUpload}
                                                    documents={equipmentInfo.documents}
                                                    onRemoveDocument={handleEquipmentDocumentRemove}
                                                />
                                            </div>
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
