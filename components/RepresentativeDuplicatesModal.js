'use client';

import { useMemo } from 'react';
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

export default function RepresentativeDuplicatesModal({ isOpen, onClose, duplicates = [] }) {
  const total = duplicates?.length || 0;
  const rows = useMemo(() => duplicates || [], [duplicates]);

  return (
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
                <th className="px-3 py-2 text-left font-medium text-gray-600">Existing Company</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Imported Representative</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Imported Company</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-3 py-2 text-gray-900">{d.existing_name}</td>
                  <td className="px-3 py-2 text-gray-900">{d.existing_company_name}</td>
                  <td className="px-3 py-2 text-gray-900">{d.imported_name}</td>
                  <td className="px-3 py-2 text-gray-900">{d.imported_company_name}</td>
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
  );
}

