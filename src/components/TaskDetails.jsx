"use client";

import { useState } from 'react';
import { useTaskById, useTaskMutation, useUpload } from '@/hooks/useTasks';
import { ArrowLeft, Upload, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * Task Details Component
 * Displays detailed information about a specific task
 * Handles video uploads and status updates
 */
export default function TaskDetails({ taskId }) {
  const router = useRouter();
  const { task, loading, error } = useTaskById(taskId);
  const { updateTask, deleteTask, loading: mutationLoading } = useTaskMutation();
  const { uploadVideo, loading: uploadLoading, progress } = useUpload();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleDeleteTask = async () => {
    if (!taskId) return;
    try {
      await deleteTask(taskId);
      router.push('/dashboard/my_tasks');
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleVideoUpload = async (file) => {
    if (!taskId || !file) return;
    try {
      await uploadVideo(taskId, file);
      // Optionally refresh task data
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg max-w-md">
          <p className="font-bold mb-2">Error Loading Task</p>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={handleBack}
            className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Not Found State
  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-gray-100 border border-gray-300 text-gray-700 px-6 py-4 rounded-lg max-w-md text-center">
          <p className="font-bold mb-2">Task Not Found</p>
          <p className="text-sm mb-4">The task you're looking for doesn't exist.</p>
          <button
            onClick={handleBack}
            className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-4 md:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg md:text-xl font-bold text-gray-900">Task Details</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8">
          {/* Task Header */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{task.title}</h2>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-lg">📅</span>
                  <span>{task.date}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-lg">🕐</span>
                  <span>{task.time}</span>
                </div>
                {task.location && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-lg">📍</span>
                    <span>{task.location}</span>
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="flex flex-wrap gap-3">
                {getStatusBadge(task.status)}
                {task.jobId && (
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 text-sm font-medium rounded-full">
                    {task.jobId}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Task Sections */}
          <div className="space-y-8">
            {/* Upload Section */}
            <TaskSection title="Video Upload">
              <VideoUploadArea
                taskId={taskId}
                onUpload={handleVideoUpload}
                loading={uploadLoading}
                progress={progress}
                uploadProgress={task.uploadProgress}
              />
            </TaskSection>

            {/* Deadline Section */}
            {task.deadline && (
              <TaskSection title="Deadline">
                <div className={`text-lg font-semibold ${task.deadlineColor || 'text-gray-700'}`}>
                  {task.deadline}
                </div>
              </TaskSection>
            )}

            {/* Additional Details */}
            {task.details && (
              <TaskSection title="Details">
                <p className="text-gray-600">{task.details}</p>
              </TaskSection>
            )}
          </div>

          {/* Actions Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3 justify-between">
            <div className="text-sm text-gray-500">
              Task ID: {task.id}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={mutationLoading}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          onConfirm={handleDeleteTask}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={mutationLoading}
        />
      )}
    </div>
  );
}

/**
 * Task Section Component
 */
function TaskSection({ title, children }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

/**
 * Video Upload Area Component
 */
function VideoUploadArea({ taskId, onUpload, loading, progress, uploadProgress }) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-lg p-6 text-center transition
        ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
        }
      `}
    >
      <input
        type="file"
        id="video-upload"
        onChange={handleFileSelect}
        accept="video/*"
        disabled={loading}
        className="hidden"
      />

      {!loading ? (
        <>
          <label
            htmlFor="video-upload"
            className="cursor-pointer flex flex-col items-center gap-3"
          >
            <Upload className="w-8 h-8 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">Drag and drop your video here</p>
              <p className="text-sm text-gray-500">or click to select a file</p>
            </div>
          </label>
          {uploadProgress && (
            <p className="text-sm text-gray-600 mt-3">{uploadProgress}</p>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-sm text-gray-600">Uploading... {progress}%</p>
        </div>
      )}
    </div>
  );
}

/**
 * Delete Confirmation Modal
 */
function DeleteConfirmModal({ onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-sm w-full p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Task</h3>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete this task? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper: Get status badge
 */
function getStatusBadge(status) {
  switch (status) {
    case 'videos-pending':
      return <span className="px-3 py-1 bg-red-50 text-red-600 text-sm font-medium rounded-full">Videos Pending</span>;
    case 'session-started':
      return <span className="px-3 py-1 bg-orange-50 text-orange-600 text-sm font-medium rounded-full">Session Started</span>;
    case 'session-not-started':
      return <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">Not Started</span>;
    default:
      return null;
  }
}
