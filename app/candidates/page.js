'use client';

import React, { useState } from 'react';
import AddCandidateModal from '../../components/AddCandidateModal';
import CandidatesTable from '../../components/CandidatesTable';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function CandidatesPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCandidateAdded = () => {
    // Trigger table refresh by updating the key
    setRefreshKey(prev => prev + 1);
  };

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Candidates</h1>
          <AddCandidateModal onCandidateAdded={handleCandidateAdded} />
        </div>
        
        <CandidatesTable key={refreshKey} />
      </div>
    </ProtectedRoute>
  );
}
