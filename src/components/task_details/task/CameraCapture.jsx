import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RotateCcw, Image as ImageIcon, Eye, Upload, Trash2 } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { resolveFileUrl } from '@/lib/config';

// Constants
const CAMERA_CONSTRAINTS = [
    { video: { width: { ideal: 1280 }, height: { ideal: 720 } } },
    { video: true }
];

const ERROR_MESSAGES = {
    NotAllowedError: 'Please allow camera access in your browser settings and try again.',
    PermissionDeniedError: 'Please allow camera access in your browser settings and try again.',
    NotFoundError: 'No camera found. Please ensure a camera is connected to your device.',
    DevicesNotFoundError: 'No camera found. Please ensure a camera is connected to your device.',
    NotReadableError: 'Camera is already in use. Please close other applications using the camera.',
    TrackStartError: 'Camera is already in use. Please close other applications using the camera.',
    default: 'Unable to access camera. Please try again.'
};

const IMAGE_QUALITY = 0.9;
const IMAGE_TYPE = 'image/jpeg';

// Generate filename based on model name
const getFilename = (modelName) => {
    if (!modelName) return 'camera-capture.jpg';
    // Convert model name to lowercase, replace spaces with hyphens, and add extension
    const sanitized = modelName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `${sanitized}.jpg`;
};

// Nicely truncate long filenames for UI while keeping extension visible
const formatFileName = (fileName) => {
    if (!fileName) return '';

    const MAX_LENGTH = 30;
    if (fileName.length <= MAX_LENGTH) return fileName;

    const dotIndex = fileName.lastIndexOf('.');
    const ext = dotIndex > 0 ? fileName.slice(dotIndex) : '';
    const base = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;

    if (base.length <= MAX_LENGTH) return `${base}${ext}`;

    // Keep start and end of base name for readability
    const start = base.slice(0, 18);
    const end = base.slice(-7);
    return `${start}...${end}${ext}`;
};

export default function CameraCapture({
    onCapture,
    onRemove,
    capturedImage = null,
    disabled = false,
    modelName = null
}) {
    const [isStreaming, setIsStreaming] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [showCaptureModal, setShowCaptureModal] = useState(false);
    const [showFullImage, setShowFullImage] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const fileInputRef = useRef(null);
    const toast = useToast();

    // Set preview URL from capturedImage
    useEffect(() => {
        if (capturedImage?.filePath) {
            setPreviewUrl(resolveFileUrl(capturedImage.filePath));
        } else if (capturedImage?.file) {
            const url = URL.createObjectURL(capturedImage.file);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setPreviewUrl(null);
        }
    }, [capturedImage]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
            if (previewUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // Helper: Get user-friendly error message
    const getErrorMessage = (error) => {
        return ERROR_MESSAGES[error?.name] || error?.message || ERROR_MESSAGES.default;
    };

    // Helper: Check if camera is supported
    const isCameraSupported = () => {
        return navigator.mediaDevices?.getUserMedia;
    };

    // Helper: Request camera access with fallback
    const requestCameraAccess = async () => {
        if (!isCameraSupported()) {
            throw new Error('Camera is not supported in this browser.');
        }

        let lastError = null;
        for (const constraints of CAMERA_CONSTRAINTS) {
            try {
                return await navigator.mediaDevices.getUserMedia(constraints);
            } catch (err) {
                lastError = err;
                continue;
            }
        }
        throw lastError || new Error('Failed to access camera');
    };

    // Start camera stream
    const startCamera = async () => {
        try {
            setError(null);
            setIsLoading(true);

            const stream = await requestCameraAccess();
            streamRef.current = stream;

            // Attach stream to video element when available
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            setIsStreaming(true);
        } catch (err) {
            setIsStreaming(false);
            const errorMessage = getErrorMessage(err);
            setError(errorMessage);
            toast.error(`${errorMessage} Alternatively, upload or drag & drop an image.`);
        } finally {
            setIsLoading(false);
        }
    };

    // Stop camera stream
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.pause();
        }
        setIsStreaming(false);
        setIsLoading(false);
    };

    // Capture photo from video stream
    const capturePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
            toast.error('Camera not ready. Please try again.');
            return;
        }

        try {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            
            canvas.toBlob((blob) => {
                if (!blob) {
                    toast.error('Failed to capture photo');
                    return;
                }
                
                const filename = getFilename(modelName);
                const file = new File([blob], filename, { 
                    type: IMAGE_TYPE,
                    lastModified: Date.now()
                });
                
                // If there was a previous capture, remove it before adding the new one
                // This ensures we replace the old image with the new one
                if (capturedImage) {
                    onRemove?.();
                }
                
                onCapture?.(file);
                stopCamera();
                setShowCaptureModal(false);
                toast.success('Photo captured successfully');
            }, IMAGE_TYPE, IMAGE_QUALITY);
        } catch (err) {
            console.error('Error capturing photo:', err);
            const errorMessage = err?.message || 'An unexpected error occurred';
            toast.error(`Failed to capture photo: ${errorMessage}`);
        }
    };

    // Handle retake - don't remove original until new capture is confirmed
    const handleRetake = () => {
        // Don't call onRemove here - only remove when new capture is actually made
        // Don't clear previewUrl - let useEffect maintain it from capturedImage
        // When modal opens and streaming starts, preview won't show (due to !isStreaming check)
        // When cancel is clicked, previewUrl will still be there and preview will show again
        setShowCaptureModal(true);
        startCamera();
    };

    // Handle file upload from device
    const handleFileUpload = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        // Close modal and stop camera if running
        if (showCaptureModal) {
            stopCamera();
            setShowCaptureModal(false);
        }

        // If there was a previous capture, remove it before adding the new one
        // This ensures we replace the old image with the new one
        if (capturedImage) {
            onRemove?.();
        }

        // Pass file to onCapture callback
        onCapture?.(file);
        toast.success('Image uploaded successfully');

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Open file picker
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    // Handle drag and drop
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (disabled) return;

        const files = Array.from(e.dataTransfer.files);
        if (files && files.length > 0) {
            const file = files[0]; // Only handle first file for camera capture
            
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast.error('Please drop an image file');
                return;
            }

            // Close modal and stop camera if running
            if (showCaptureModal) {
                stopCamera();
                setShowCaptureModal(false);
            }

            // If there was a previous capture, remove it before adding the new one
            if (capturedImage) {
                onRemove?.();
            }

            // Pass file to onCapture callback
            onCapture?.(file);
            toast.success('Image uploaded successfully');
        }
    };

    return (
        <>
            <div 
                className={`rounded-xl border-2 p-4 transition-colors ${
                    isDragging && !disabled
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-gray-50'
                } ${disabled ? 'opacity-80' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {!isStreaming && !previewUrl && (
                    <div className={`flex flex-wrap items-center justify-between gap-4 ${disabled ? 'opacity-80' : ''}`}>
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-300 text-blue-500">
                                <Camera className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Take a photo with your camera</p>
                                <p className="text-xs text-gray-500">Capture a photo or drag & drop an image</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setShowCaptureModal(true);
                                startCamera();
                            }}
                            disabled={disabled}
                            className={`inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium transition ${
                                disabled 
                                    ? 'cursor-not-allowed bg-gray-100 text-gray-400' 
                                    : 'cursor-pointer text-gray-700 hover:bg-white'
                            }`}
                        >
                            Start Camera
                        </button>
                    </div>
                )}

                {/* Streaming is handled in the capture modal */}

                {previewUrl && !isStreaming && !showCaptureModal && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Left half: Camera description with icon */}
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-300 text-blue-500 bg-blue-50 flex-shrink-0">
                                <Camera className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Take a photo with your camera</p>
                                <p className="text-xs text-gray-500">Capture a photo or drag & drop an image</p>
                            </div>
                        </div>

                        {/* Right half: Captured image controls */}
                        <div>
                            <div 
                                onClick={() => !disabled && setShowFullImage(true)}
                                className={`group flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all ${
                                    disabled 
                                        ? 'cursor-not-allowed opacity-80' 
                                        : 'cursor-pointer hover:shadow-md'
                                }`}
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-sm font-semibold text-red-600">
                                    <ImageIcon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {modelName || 'Camera Image'}
                                    </p>
                                    {(() => {
                                        const rawFileName =
                                            capturedImage?.fileName ||
                                            capturedImage?.name ||
                                            getFilename(modelName);
                                        const displayName = formatFileName(rawFileName);
                                        return (
                                            <p
                                                className="text-xs text-gray-500 truncate"
                                                title={rawFileName}
                                            >
                                                {displayName}
                                            </p>
                                        );
                                    })()}
                                </div>
                                <div className="flex items-center gap-2">
                                    {!disabled && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowFullImage(true);
                                            }}
                                            className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                            aria-label="View image"
                                            title="View image"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRetake();
                                        }}
                                        disabled={disabled}
                                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label="Retake photo"
                                        title="Retake"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                    </button>
                                    {onRemove && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemove();
                                            }}
                                            disabled={disabled}
                                            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            aria-label="Remove image"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Capture Modal */}
            {showCaptureModal && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
                    onClick={() => {
                        stopCamera();
                        setShowCaptureModal(false);
                    }}
                >
                    <div 
                        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Take a photo with your camera</h3>
                            <button
                                type="button"
                                onClick={() => {
                                    stopCamera();
                                    setShowCaptureModal(false);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="relative bg-black rounded-lg overflow-hidden w-full" style={{ minHeight: '400px', maxHeight: '70vh' }}>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-contain"
                                    style={{ minHeight: '400px', maxHeight: '70vh' }}
                                    onLoadedMetadata={() => {
                                        if (videoRef.current) {
                                            videoRef.current.play().catch(err => {
                                                console.error('Error playing video:', err);
                                                toast.error('Failed to start video preview');
                                                stopCamera();
                                            });
                                        }
                                    }}
                                    onError={(e) => {
                                        console.error('Video error:', e);
                                        toast.error('Failed to display camera preview');
                                        stopCamera();
                                    }}
                                />
                                {(isLoading || !streamRef.current) && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                                            <div className="text-white text-sm">Starting camera...</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={handleUploadClick}
                                    disabled={disabled}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                >
                                    <Upload className="h-4 w-4" />
                                    Upload Image
                                </button>
                                <button
                                    type="button"
                                    onClick={capturePhoto}
                                    disabled={disabled || !isStreaming}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    <Camera className="h-4 w-4" />
                                    Capture Photo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        stopCamera();
                                        setShowCaptureModal(false);
                                    }}
                                    disabled={disabled}
                                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Full Image Modal */}
            {showFullImage && previewUrl && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
                    onClick={() => setShowFullImage(false)}
                >
                    <div 
                        className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between z-10">
                            <h3 className="text-lg font-semibold text-gray-900">{modelName || 'Camera Image'}</h3>
                            <button
                                type="button"
                                onClick={() => setShowFullImage(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 overflow-auto max-h-[calc(90vh-80px)]">
                            <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                                <img
                                    src={previewUrl}
                                    alt="Captured business card"
                                    className="w-full h-auto object-contain"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
