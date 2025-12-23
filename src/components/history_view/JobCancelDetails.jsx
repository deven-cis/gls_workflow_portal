"use client";

import React from "react";
import { MapPin, Clock, X, Pencil } from "lucide-react";

// Read-only job cancel details modal for history view
export default function JobCancelDetails({ isOpen, onClose, jobDetails }) {
  if (!isOpen || !jobDetails) return null;

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
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <Pencil size={16} />
              </button>
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
          {/* Job Title with Cancelled Status */}
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold text-gray-900 flex-1">
              {jobDetails.jobTitle || 'N/A'}
            </h1>
            <span className="text-sm font-medium text-red-600 whitespace-nowrap">
              Cancelled
            </span>
          </div>

          {/* Location and Time */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin size={16} className="text-gray-600 flex-shrink-0" />
              <p className="text-gray-700">{jobDetails.location || 'N/A'}</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} className="text-gray-600 flex-shrink-0" />
              <p className="text-gray-700">{jobDetails.time || 'N/A'}</p>
            </div>
          </div>

          {/* Cancellation Reason Section - Rounded rectangle with border */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Cancellation Reason
            </h3>
            <div className="space-y-3">
              {/* Cancel Reason Badge - Gray rounded tag */}
              <div>
                <span className="inline-block px-4 py-2 bg-gray-100 text-gray-900 rounded-lg text-sm font-medium">
                  {jobDetails.cancelReason || 'N/A'}
                </span>
              </div>
              
              {/* Cancel Details - Text below the badge */}
              {jobDetails.cancelDetails && (
                <p className="text-sm text-gray-700">
                  {jobDetails.cancelDetails}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

