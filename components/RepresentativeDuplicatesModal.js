'use client';

import { useMemo, useState, useEffect } from 'react';
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import RepresentativeDetailModal from '@/components/RepresentativeDetailModal';
import RepresentativeDialog from '@/components/RepresentativeDialog';

export default function RepresentativeDuplicatesModal({ isOpen, onClose, duplicates = [] }) {
  const total = duplicates?.length || 0;
  const [localDuplicates, setLocalDuplicates] = useState(duplicates || []);
  const rows = useMemo(() => localDuplicates, [localDuplicates]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRepId, setSelectedRepId] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRepresentative, setEditingRepresentative] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // Update local duplicates when prop changes
  useEffect(() => {
    setLocalDuplicates(duplicates || []);
  }, [duplicates]);

  const handleRepresentativeClick = (repId) => {
    if (repId) {
      setSelectedRepId(repId);
      setDetailModalOpen(true);
    }
  };

  const handleEditClick = async (repId) => {
    if (!repId) return;
    
    try {
      // Import supabase here to fetch representative data
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('representatives')
        .select('*')
        .eq('id', repId)
        .single();
      
      if (!error && data) {
        setEditingRepresentative(data);
        setEditDialogOpen(true);
      }
    } catch (err) {
      console.error('Error fetching representative for edit:', err);
    }
  };

  const handleEditSave = async (representativeData) => {
    if (!editingRepresentative) return;
    
    setEditLoading(true);
    try {
      const { updateRepresentative } = await import('@/lib/representatives');
      const { getCurrentUserWithRole } = await import('@/lib/auth');
      
      const currentUser = await getCurrentUserWithRole();
      if (!currentUser) {
        console.error('No current user found');
        return;
      }
      
      const result = await updateRepresentative(editingRepresentative.id, representativeData, currentUser.id);
      
      if (!result.error && result.data) {
        const updatedRep = result.data;
        
        // Update local duplicates state to reflect changes and mark as edited
        setLocalDuplicates(prev => prev.map(entry => {
          if (entry.existing_id === updatedRep.id) {
            return { 
              ...entry, 
              existing_name: updatedRep.full_name, 
              existing_edited: true 
            };
          }
          if (entry.imported_id === updatedRep.id) {
            return { 
              ...entry, 
              imported_name: updatedRep.full_name, 
              imported_edited: true 
            };
          }
          return entry;
        }));
        
        // Close edit dialog
        setEditDialogOpen(false);
        setEditingRepresentative(null);
      } else {
        console.error('Error updating representative:', result.error);
      }
    } catch (err) {
      console.error('Error saving representative:', err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteRepresentative = async (repId) => {
    if (!repId) return;
    
    if (!window.confirm('Are you sure you want to delete this representative?')) {
      return;
    }
    
    try {
      const { deleteRepresentative } = await import('@/lib/representatives');
      const { getCurrentUserWithRole } = await import('@/lib/auth');
      
      const currentUser = await getCurrentUserWithRole();
      if (!currentUser) {
        console.error('No current user found');
        return;
      }
      
      const { error } = await deleteRepresentative(repId, currentUser.id);
      
      if (!error) {
        // Remove the deleted representative from local duplicates
        setLocalDuplicates(prev => prev.filter(entry => 
          entry.existing_id !== repId && entry.imported_id !== repId
        ));
        
        // Close detail modal if it's showing the deleted representative
        if (detailModalOpen && selectedRepId === repId) {
          setDetailModalOpen(false);
          setSelectedRepId(null);
        }
      } else {
        console.error('Error deleting representative:', error);
      }
    } catch (err) {
      console.error('Error deleting representative:', err);
    }
  };

  return (
    <>
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent className="sm:max-w-[1000px] max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Some representatives already exist</AlertDialogTitle>
          <AlertDialogDescription>
            We detected {total} duplicate{total === 1 ? '' : 's'} by matching full name and company name. Imports were completed; review below.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="mt-2 border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Existing Representative</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Imported Representative</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-3 py-2">
                    <div className="flex items-center space-x-2">
                      {d.existing_id ? (
                        <button
                          className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                          onClick={() => handleRepresentativeClick(d.existing_id)}
                        >
                          {d.existing_name}
                        </button>
                      ) : (
                        <span className="text-gray-900">{d.existing_name}</span>
                      )}
                      {d.existing_edited && (
                        <Badge className="text-[10px] bg-green-100 text-green-800 border-green-200">
                          Edited
                        </Badge>
                      )}
                      {d.existing_id && (
                        <>
                          <button
                            className="text-gray-500 hover:text-gray-700"
                            title="Edit representative"
                            onClick={() => handleEditClick(d.existing_id)}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-800"
                            title="Delete representative"
                            onClick={() => handleDeleteRepresentative(d.existing_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center space-x-2">
                      {d.imported_id ? (
                        <button
                          className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                          onClick={() => handleRepresentativeClick(d.imported_id)}
                        >
                          {d.imported_name}
                        </button>
                      ) : (
                        <span className="text-gray-900">{d.imported_name}</span>
                      )}
                      {d.imported_edited && (
                        <Badge className="text-[10px] bg-green-100 text-green-800 border-green-200">
                          Edited
                        </Badge>
                      )}
                      {d.imported_id && (
                        <>
                          <button
                            className="text-gray-500 hover:text-gray-700"
                            title="Edit representative"
                            onClick={() => handleEditClick(d.imported_id)}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-800"
                            title="Delete representative"
                            onClick={() => handleDeleteRepresentative(d.imported_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <RepresentativeDetailModal
      isOpen={detailModalOpen}
      onClose={() => setDetailModalOpen(false)}
      representativeId={selectedRepId}
    />

    <RepresentativeDialog
      isOpen={editDialogOpen}
      onClose={() => {
        setEditDialogOpen(false);
        setEditingRepresentative(null);
      }}
      onSave={handleEditSave}
      representative={editingRepresentative}
      loading={editLoading}
    />
    </>
  );
}

