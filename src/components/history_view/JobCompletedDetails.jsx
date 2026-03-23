"use client";

import React, { useState } from "react";
import { MapPin, Clock, X, Download, Video, Pencil } from "lucide-react";
import { historyAPI } from '@/services/history_apis';
import { useToast } from '@/contexts/ToastContext';
import { formatFileSizeMB } from '@/lib/utils';

// Read-only job details modal for history view
export default function JobCompletedDetails({ isOpen, onClose, jobDetails }) {
  const [downloadingVideo, setDownloadingVideo] = useState(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const toast = useToast();

  if (!isOpen || !jobDetails) return null;

  const hasRecordings = Array.isArray(jobDetails.recordings) && jobDetails.recordings.length > 0;
  const hasWitnesses = Array.isArray(jobDetails.witnesses) && jobDetails.witnesses.length > 0;
  const hasAttorneys = Array.isArray(jobDetails.attorneys) && jobDetails.attorneys.length > 0;

  const handleDownloadVideo = async (recording) => {
    if (!recording.videoId && !recording.filePath) {
      toast.error('Video download information not available');
      return;
    }

    try {
      setDownloadingVideo(recording.fileName);
      await historyAPI.downloadVideo({
        videoId: recording.videoId,
        filePath: recording.filePath,
        fileName: recording.fileName,
      });
      toast.success('Video downloaded successfully');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download video. Please try again.');
    } finally {
      setDownloadingVideo(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!hasRecordings) return;

    try {
      setDownloadingAll(true);
      // Get job number from jobDetails
      const jobNo = jobDetails.jobNo;
      
      if (!jobNo) {
        toast.error('Job number not available');
        return;
      }

      // Use the backend API to merge and download all videos
      // Backend will merge all videos using FFmpeg and return as a single file
      await historyAPI.downloadAllVideos(jobNo);
      toast.success('All videos merged and downloaded successfully');
    } catch (err) {
      console.error('Download all error:', err);
      toast.error('Failed to download merged video. Please try again.');
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-transparent bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-end p-4">
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-3xl h-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900">Job Details</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Job Title */}
          <div>
            <p className="text-xl font-semibold text-gray-900">
              {jobDetails.jobTitle || 'N/A'}
            </p>
          </div>

          {/* Location and Time */}
          <div className="flex flex-col gap-2 border-b border-gray-200 pb-4">
            <div className="flex items-center gap-2 text-sm">
              <MapPin size={16} className="text-gray-600" />
              <p className="text-gray-700">{jobDetails.location || 'N/A'}</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} className="text-gray-600" />
              <p className="text-gray-700">{jobDetails.time || 'N/A'}</p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            {/* Basic Details */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Basic Details
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 text-xs">Case Name</span>
                  <span className="text-gray-700 text-xs font-medium">
                    {jobDetails.caseName || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-xs">Case Number</span>
                  <span className="text-gray-700 text-xs font-medium">
                    {jobDetails.caseNumber || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Attorneys */}
            {hasAttorneys && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Attorneys
                </h3>
                <div className="space-y-2">
                  {jobDetails.attorneys.map((attorney, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-xs">Name</span>
                        <span className="text-gray-700 text-xs font-medium">
                          {attorney.name || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-xs">Firm</span>
                        <span className="text-gray-700 text-xs font-medium">
                          {attorney.firm || 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Witnesses */}
            {hasWitnesses && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Witnesses
                </h3>
                <div className="space-y-2">
                  {jobDetails.witnesses.map((witness, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-gray-500 text-xs">Name</span>
                      <span className="text-gray-700 text-xs font-medium">
                        {witness.name || 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recordings */}
          <div>
            <div className="flex justify-between mb-3">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recordings
                </h3>
                {hasRecordings && (
                  <span className="text-sm text-gray-500 ml-4 bg-gray-200 px-2 py-1 rounded-xl">
                    {jobDetails.recordings.length}
                  </span>
                )}
              </div>
              {hasRecordings && (
                <button
                  type="button"
                  onClick={handleDownloadAll}
                  disabled={downloadingAll}
                  className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2.5 rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={16} />
                  {downloadingAll ? 'Downloading...' : 'Download All'}
                </button>
              )}
            </div>

            {hasRecordings ? (
              <div className="space-y-4">
                {jobDetails.recordings.map((recording, index) => (
                  <div key={index} className="space-y-2">
                    <h4 className="text-gray-900 font-semibold">
                      {recording.name || 'N/A'}
                    </h4>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <Video size={30} className="text-gray-500" />
                        <div>
                          <p className="text-gray-700 text-sm font-medium">
                            {recording.fileName || 'N/A'}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {formatFileSizeMB(recording.size)}
                          </p>
                        </div>
                      </div>
                      {recording.filePath && (
                        <button
                          type="button"
                          onClick={() => handleDownloadVideo(recording)}
                          disabled={downloadingVideo === recording.fileName}
                          className="flex items-center gap-1.5 text-gray-600 hover:text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Download size={16} />
                          {downloadingVideo === recording.fileName ? 'Downloading...' : 'Download'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 border border-gray-200 rounded-lg bg-gray-50">
                <Video size={48} className="text-gray-400 mb-3" />
                <p className="text-gray-600 text-sm font-medium">No Recordings</p>
                <p className="text-gray-500 text-xs mt-1">There are no recordings available for this job.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
