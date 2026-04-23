"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MapPin, Clock, X, Download, Video } from "lucide-react";
import { historyAPI } from '@/services/history_apis';
import { witnessesAPI } from '@/services/witnesses_apis';
import { useToast } from '@/contexts/ToastContext';
import { formatFileSizeMB } from '@/lib/utils';

// Read-only job details modal for history view
export default function JobCompletedDetails({ isOpen, onClose, jobDetails }) {
  const [downloadingVideo, setDownloadingVideo] = useState(null);
  const [witnessesState, setWitnessesState] = useState([]);
  const [requestingMergeWitnessId, setRequestingMergeWitnessId] = useState(null);
  const [downloadingMergedWitnessId, setDownloadingMergedWitnessId] = useState(null);
  const toast = useToast();

  const hasWitnesses = Array.isArray(jobDetails?.witnesses) && jobDetails.witnesses.length > 0;
  const hasAttorneys = Array.isArray(jobDetails?.attorneys) && jobDetails.attorneys.length > 0;

  useEffect(() => {
    setWitnessesState(Array.isArray(jobDetails?.witnesses) ? jobDetails.witnesses : []);
  }, [jobDetails]);

  const activeMergeWitnessIds = useMemo(
    () =>
      witnessesState
        .filter((witness) => ['pending', 'processing'].includes(String(witness?.merge_status || '').toLowerCase()))
        .map((witness) => witness.id)
        .filter(Boolean),
    [witnessesState]
  );

  useEffect(() => {
    if (!isOpen || !activeMergeWitnessIds.length) return undefined;

    const intervalId = window.setInterval(() => {
      activeMergeWitnessIds.forEach(async (witnessId) => {
        try {
          const statusResult = await witnessesAPI.getWitnessCompleteVideoStatus(witnessId);
          setWitnessesState((prev) =>
            prev.map((witness) =>
              witness.id === witnessId
                ? {
                    ...witness,
                    merged_video_path: statusResult?.merged_video_path ?? witness.merged_video_path ?? null,
                    merged_video_name: statusResult?.merged_video_name ?? witness.merged_video_name ?? null,
                    merged_video_size: statusResult?.merged_video_size ?? witness.merged_video_size ?? null,
                    merged_duration: statusResult?.merged_duration ?? witness.merged_duration ?? null,
                    merge_status: statusResult?.merge_status ?? witness.merge_status ?? null,
                    merge_error: statusResult?.merge_error ?? witness.merge_error ?? null,
                    merge_requested_at: statusResult?.merge_requested_at ?? witness.merge_requested_at ?? null,
                    merge_completed_at: statusResult?.merge_completed_at ?? witness.merge_completed_at ?? null,
                  }
                : witness
            )
          );
        } catch (error) {
          console.warn('Failed to refresh witness merge status from history modal:', error);
        }
      });
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [activeMergeWitnessIds, isOpen]);

  if (!isOpen || !jobDetails) return null;

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
      const message = err?.message || 'Failed to download video. Please try again.';
      if (!/missing on server/i.test(message)) {
        console.warn('Download error:', err);
      }
      toast.error(message);
    } finally {
      setDownloadingVideo(null);
    }
  };

  const handleGenerateMergedVideo = async (witness) => {
    if (!witness?.id) return;
    try {
      setRequestingMergeWitnessId(witness.id);
      const result = await witnessesAPI.requestWitnessCompleteVideoMerge(witness.id);
      setWitnessesState((prev) =>
        prev.map((item) =>
          item.id === witness.id
            ? {
                ...item,
                merged_video_path: result?.merged_video_path ?? item.merged_video_path ?? null,
                merged_video_name: result?.merged_video_name ?? item.merged_video_name ?? null,
                merged_video_size: result?.merged_video_size ?? item.merged_video_size ?? null,
                merged_duration: result?.merged_duration ?? item.merged_duration ?? null,
                merge_status: result?.merge_status ?? item.merge_status ?? 'pending',
                merge_error: result?.merge_error ?? null,
                merge_requested_at: result?.merge_requested_at ?? item.merge_requested_at ?? null,
                merge_completed_at: result?.merge_completed_at ?? item.merge_completed_at ?? null,
              }
            : item
        )
      );
      toast.success(
        String(result?.merge_status || '').toLowerCase() === 'completed'
          ? 'Merged video is already available'
          : 'Merged video generation started'
      );
    } catch (err) {
      console.error('Generate merged video error:', err);
      toast.error(err?.message || 'Failed to start merged video generation. Please try again.');
    } finally {
      setRequestingMergeWitnessId(null);
    }
  };

  const handleDownloadMergedVideo = async (witness) => {
    if (!witness?.id) return;
    try {
      setDownloadingMergedWitnessId(witness.id);
      await witnessesAPI.downloadWitnessesCompleteVideo(
        witness.id,
        witness.merged_video_name || `${witness.witness_name || 'witness'}_complete_video.mp4`
      );
      toast.success('Merged video download started');
    } catch (err) {
      console.error('Download merged video error:', err);
      toast.error(err?.message || 'Failed to download merged video. Please try again.');
    } finally {
      setDownloadingMergedWitnessId(null);
    }
  };

  const getWitnessVideos = (witness) =>
    Array.isArray(witness?.witness_videos)
      ? witness.witness_videos.filter((video) => video?.file_name && video?.file_path)
      : [];

  const canGenerateMerge = (witness) => getWitnessVideos(witness).length > 1;

  const getMergeActionState = (witness) => {
    const status = String(witness?.merge_status || '').toLowerCase();
    const hasMergedVideo = Boolean(witness?.merged_video_path);
    if (hasMergedVideo && status === 'completed') return 'download';
    if (requestingMergeWitnessId === witness?.id || status === 'pending' || status === 'processing') return 'generating';
    if (canGenerateMerge(witness)) return 'generate';
    return 'none';
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
                  {witnessesState.map((witness, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-gray-500 text-xs">Name</span>
                      <span className="text-gray-700 text-xs font-medium">
                        {witness.witness_name || witness.name || 'N/A'}
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
                {witnessesState.length > 0 && (
                  <span className="text-sm text-gray-500 ml-4 bg-gray-200 px-2 py-1 rounded-xl">
                    {witnessesState.reduce((count, witness) => count + getWitnessVideos(witness).length, 0)}
                  </span>
                )}
              </div>
            </div>

            {witnessesState.some((witness) => getWitnessVideos(witness).length > 0) ? (
              <div className="space-y-4">
                {witnessesState.map((witness) => {
                  const witnessVideos = getWitnessVideos(witness);
                  if (!witnessVideos.length) return null;
                  const mergeActionState = getMergeActionState(witness);

                  return (
                    <div key={witness.id || witness.witness_name} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-gray-900 font-semibold">
                          {witness.witness_name || witness.name || 'N/A'}
                        </h4>
                        {mergeActionState === 'download' && (
                          <button
                            type="button"
                            onClick={() => handleDownloadMergedVideo(witness)}
                            disabled={downloadingMergedWitnessId === witness.id}
                            className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Download size={16} />
                            {downloadingMergedWitnessId === witness.id ? 'Downloading...' : 'Download Merged Video'}
                          </button>
                        )}
                        {mergeActionState === 'generate' && (
                          <button
                            type="button"
                            onClick={() => handleGenerateMergedVideo(witness)}
                            disabled={requestingMergeWitnessId === witness.id}
                            className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Video size={16} />
                            Generate Merged Video
                          </button>
                        )}
                        {mergeActionState === 'generating' && (
                          <button
                            type="button"
                            disabled
                            className="flex items-center gap-2 bg-gray-100 text-gray-500 px-4 py-2 rounded-lg font-medium text-sm cursor-not-allowed"
                          >
                            <span
                              className="inline-block w-3.5 h-3.5 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin"
                              aria-hidden="true"
                            />
                            Generating...
                          </button>
                        )}
                      </div>

                      {witnessVideos.map((recording, index) => (
                        <div key={`${witness.id || witness.witness_name}-${recording.id || index}`} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3">
                            <Video size={30} className="text-gray-500" />
                            <div>
                              <p className="text-gray-700 text-sm font-medium">
                                {recording.file_name || 'N/A'}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {formatFileSizeMB(recording.file_size)}
                              </p>
                            </div>
                          </div>
                          {recording.file_path && (
                        <button
                          type="button"
                              onClick={() => handleDownloadVideo({
                                videoId: recording.id,
                                filePath: recording.file_path,
                                fileName: recording.file_name,
                              })}
                              disabled={downloadingVideo === recording.file_name}
                          className="flex items-center gap-1.5 text-gray-600 hover:text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Download size={16} />
                              {downloadingVideo === recording.file_name ? 'Downloading...' : 'Download'}
                        </button>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
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
