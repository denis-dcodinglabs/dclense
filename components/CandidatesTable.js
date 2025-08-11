'use client';

import React, { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { getCandidates, getCVPublicUrl, deleteCandidate } from '../app/candidates/candidatesHelpers';
import CandidateDetailModal from './CandidateDetailModal';
import EditCandidateModal from './EditCandidateModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

export default function CandidatesTable() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const data = await getCandidates();
      setCandidates(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (candidate) => {
    setCandidateToDelete(candidate);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!candidateToDelete) return;
    
    try {
      setDeleting(true);
      await deleteCandidate(candidateToDelete.id);
      
      // Remove the candidate from the local state
      setCandidates(prev => prev.filter(c => c.id !== candidateToDelete.id));
      
      // Close the dialog and reset state
      setDeleteDialogOpen(false);
      setCandidateToDelete(null);
    } catch (error) {
      console.error('Error deleting candidate:', error);
      setError('Failed to delete candidate. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setCandidateToDelete(null);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredCandidates = candidates
    .filter(candidate => {
      const searchLower = searchTerm.toLowerCase();
      return (
        candidate.first_name?.toLowerCase().includes(searchLower) ||
        candidate.last_name?.toLowerCase().includes(searchLower) ||
        candidate.email_1?.toLowerCase().includes(searchLower) ||
        candidate.current_company?.toLowerCase().includes(searchLower) ||
        candidate.title?.toLowerCase().includes(searchLower) ||
        candidate.status?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (sortField === 'created_at' || sortField === 'user_date_added') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      } else {
        aValue = (aValue || '').toString().toLowerCase();
        bValue = (bValue || '').toString().toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCandidates = filteredCandidates.slice(startIndex, endIndex);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        Error loading candidates: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search candidates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchCandidates}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {currentCandidates.length} of {filteredCandidates.length} candidates
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th 
                className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('first_name')}
              >
                Name
                {sortField === 'first_name' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('title')}
              >
                Title
                {sortField === 'title' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('current_company')}
              >
                Company
                {sortField === 'current_company' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('email_1')}
              >
                Email
                {sortField === 'email_1' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('mobile_phone')}
              >
                Phone
                {sortField === 'mobile_phone' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                Status
                {sortField === 'status' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('current_salary')}
              >
                Current Salary
                {sortField === 'current_salary' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('desired_salary')}
              >
                Desired Salary
                {sortField === 'desired_salary' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('user_date_added')}
              >
                Date Added
                {sortField === 'user_date_added' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-4 py-3 text-left font-medium">CV</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {currentCandidates.map((candidate) => (
              <tr key={candidate.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium">
                      {candidate.first_name} {candidate.middle_name} {candidate.last_name}
                    </div>
                    {candidate.source && (
                      <div className="text-xs text-gray-500">Source: {candidate.source}</div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {candidate.title || '-'}
                </td>
                <td className="px-4 py-3">
                  {candidate.current_company || '-'}
                </td>
                <td className="px-4 py-3">
                  <div>
                    {candidate.email_1 && (
                      <div className="text-blue-600 hover:underline">
                        <a href={`mailto:${candidate.email_1}`}>{candidate.email_1}</a>
                      </div>
                    )}
                    {candidate.email_2 && (
                      <div className="text-blue-600 hover:underline text-xs">
                        <a href={`mailto:${candidate.email_2}`}>{candidate.email_2}</a>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {candidate.mobile_phone ? (
                    <a href={`tel:${candidate.mobile_phone}`} className="text-blue-600 hover:underline">
                      {candidate.mobile_phone}
                    </a>
                  ) : '-'}
                </td>
                <td className="px-4 py-3">
                  {candidate.status ? (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(candidate.status)}`}>
                      {candidate.status}
                    </span>
                  ) : '-'}
                </td>
                <td className="px-4 py-3">
                  {formatSalary(candidate.current_salary)}
                </td>
                <td className="px-4 py-3">
                  {formatSalary(candidate.desired_salary)}
                </td>
                <td className="px-4 py-3">
                  {formatDate(candidate.user_date_added)}
                </td>
                <td className="px-4 py-3">
                  {candidate.cv_url ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(getCVPublicUrl(candidate.cv_url), '_blank')}
                    >
                      View CV
                    </Button>
                  ) : '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCandidate(candidate);
                        setDetailModalOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCandidate(candidate);
                        setEditModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(candidate)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* No Results */}
      {currentCandidates.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? 'No candidates found matching your search.' : 'No candidates found.'}
        </div>
      )}

      {/* Detail Modal */}
      <CandidateDetailModal
        candidate={selectedCandidate}
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedCandidate(null);
        }}
      />

      {/* Edit Modal */}
      <EditCandidateModal
        candidate={selectedCandidate}
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedCandidate(null);
        }}
        onCandidateUpdated={(updated) => {
          // Update the candidate list with the edited candidate
          setCandidates((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
          // Keep modal state in sync with latest candidate
          setSelectedCandidate((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => !deleting && setDeleteDialogOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Candidate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>
                {candidateToDelete?.first_name} {candidateToDelete?.last_name}
              </strong>
              ? This action cannot be undone.
              {candidateToDelete?.cv_url && (
                <span className="block mt-2 text-amber-600">
                  This will also delete their CV file from storage.
                </span>
              )}
              {deleting && (
                <div className="flex items-center gap-2 mt-3 p-2 bg-blue-50 rounded-md">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-blue-700 text-sm">Deleting candidate...</span>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel} disabled={deleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Deleting...
                </div>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 