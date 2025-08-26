'use client';

import React from 'react';
import { Button } from './ui/button';
import { getCVPublicUrl } from '../app/candidates/candidatesHelpers';

export default function CandidateDetailModal({ candidate, open, onClose }) {
  if (!open || !candidate) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const formatSalary = (salary) => {
    if (!salary) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(salary);
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'active': 'bg-green-100 text-green-800',
      'inactive': 'bg-gray-100 text-gray-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'rejected': 'bg-red-100 text-red-800',
      'hired': 'bg-blue-100 text-blue-800',
    };
    return statusColors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="bg-white dark:bg-gray-900 w-full h-full max-w-none max-h-none overflow-auto shadow-lg rounded-none p-0">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold">
                Candidate Details: {candidate.first_name} {candidate.last_name}
              </h2>
              <button
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl font-bold focus:outline-none"
                onClick={onClose}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Personal Information</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">First Name</label>
                      <p className="mt-1">{candidate.first_name || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Middle Name</label>
                      <p className="mt-1">{candidate.middle_name || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Last Name</label>
                      <p className="mt-1">{candidate.last_name || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <p className="mt-1">
                        {candidate.status ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(candidate.status)}`}>
                            {candidate.status}
                          </span>
                        ) : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Contact Information</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Primary Email</label>
                      <p className="mt-1">
                        {candidate.email_1 ? (
                          <a href={`mailto:${candidate.email_1}`} className="text-blue-600 hover:underline">
                            {candidate.email_1}
                          </a>
                        ) : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Secondary Email</label>
                      <p className="mt-1">
                        {candidate.email_2 ? (
                          <a href={`mailto:${candidate.email_2}`} className="text-blue-600 hover:underline">
                            {candidate.email_2}
                          </a>
                        ) : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Mobile Phone</label>
                      <p className="mt-1">
                        {candidate.mobile_phone ? (
                          <a href={`tel:${candidate.mobile_phone}`} className="text-blue-600 hover:underline">
                            {candidate.mobile_phone}
                          </a>
                        ) : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Professional Information</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Title</label>
                      <p className="mt-1">{candidate.title || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Current Company</label>
                      <p className="mt-1">{candidate.current_company || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Industry</label>
                      <p className="mt-1">{candidate.industry || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Years of Experience</label>
                      <p className="mt-1">{candidate.years_of_experience || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Category</label>
                      <p className="mt-1">{candidate.category || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Skills</label>
                      <p className="mt-1">{candidate.skills || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Salary Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Salary & Availability</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Current Salary</label>
                      <p className="mt-1">{formatSalary(candidate.current_salary)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Desired Salary</label>
                      <p className="mt-1">{formatSalary(candidate.desired_salary)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Date Available</label>
                      <p className="mt-1">{formatDate(candidate.date_available)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Willing to Relocate</label>
                      <p className="mt-1">{candidate.willing_to_relocate ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Address</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Address</label>
                      <p className="mt-1">{candidate.address || '-'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">City</label>
                        <p className="mt-1">{candidate.city || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">State</label>
                        <p className="mt-1">{candidate.state || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">ZIP</label>
                        <p className="mt-1">{candidate.zip || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Additional Information</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Source</label>
                      <p className="mt-1">{candidate.source || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Referred By</label>
                      <p className="mt-1">{candidate.referred_by || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Ownership</label>
                      <p className="mt-1">{candidate.ownership || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Date Added</label>
                      <p className="mt-1">{formatDate(candidate.user_date_added)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">General Comments</label>
                    <p className="mt-1 whitespace-pre-wrap">{candidate.general_comments || '-'}</p>
                  </div>
                </div>
              </div>

              {/* CV Section */}
              {candidate.cv_url && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">CV Document</h3>
                  <Button
                    onClick={() => window.open(getCVPublicUrl(candidate.cv_url), '_blank')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    View CV Document
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 