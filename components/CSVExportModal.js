'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, AlertCircle } from 'lucide-react';
import { exportToCSV, downloadCSV, getAllCompaniesForExport, getAllRepresentativesForExport } from '@/lib/csvUtils';
import { getCurrentUserWithRole } from '@/lib/auth';

const COMPANY_EXPORT_FIELDS = [
  { key: 'company_name', label: 'Company Name' },
  { key: 'industry', label: 'Industry' },
  { key: 'location', label: 'Location' },
  { key: 'linkedin_url', label: 'LinkedIn URL' },
  { key: 'website', label: 'Website' },
  { key: 'source', label: 'Contact Origin' },
  { key: 'number_of_employees', label: 'Number of Employees' },
  { key: 'status', label: 'Status' },
  { key: 'notes', label: 'Notes' },
  { key: 'last_activity_date', label: 'Last Activity Date' },
  { key: 'assigned_to', label: 'Assigned To' },
  { key: 'created_at', label: 'Created Date' },
  { key: 'updated_at', label: 'Updated Date' }
];

const REPRESENTATIVE_EXPORT_FIELDS = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'role', label: 'Role' },
  { key: 'company_name', label: 'Company Name' },
  { key: 'linkedin_profile_url', label: 'LinkedIn Profile URL' },
  { key: 'method_of_contact', label: 'Method of Contact' },
  { key: 'contact_source', label: 'Contact Origin' },
  { key: 'status', label: 'Status' },
  { key: 'contact_date', label: 'Contact Date' },
  { key: 'outcome', label: 'Outcome' },
  { key: 'notes', label: 'Notes' },
  { key: 'contacted_by', label: 'Contacted By' },
  { key: 'assigned_to', label: 'Assigned To' },
  { key: 'created_at', label: 'Created Date' },
  { key: 'updated_at', label: 'Updated Date' }
];

export default function CSVExportModal({ isOpen, onClose, data, exportType = 'companies', selectedItems = [], filters = {} }) {
  const [selectedFields, setSelectedFields] = useState([]);
  const [exportScope, setExportScope] = useState('all'); // all, filtered, current, selected
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (isOpen) {
      getCurrentUser();
      // Default to all fields selected
      const fields = exportType === 'companies' ? COMPANY_EXPORT_FIELDS : REPRESENTATIVE_EXPORT_FIELDS;
      setSelectedFields(fields.map(f => f.key));
      setPurpose('');
      setError('');
    }
  }, [isOpen]);

  const getCurrentUser = async () => {
    const user = await getCurrentUserWithRole();
    setCurrentUser(user);
  };

  const handleFieldToggle = (fieldKey, checked) => {
    if (checked) {
      setSelectedFields(prev => [...prev, fieldKey]);
    } else {
      setSelectedFields(prev => prev.filter(key => key !== fieldKey));
    }
  };

  const handleSelectAll = (checked) => {
    const fields = exportType === 'companies' ? COMPANY_EXPORT_FIELDS : REPRESENTATIVE_EXPORT_FIELDS;
    if (checked) {
      setSelectedFields(fields.map(f => f.key));
    } else {
      setSelectedFields([]);
    }
  };

  const validateExport = () => {
    if (selectedFields.length === 0) {
      setError('Please select at least one field to export');
      return false;
    }

    if (!purpose.trim()) {
      setError('Please provide a purpose for this export');
      return false;
    }

    setError('');
    return true;
  };

  const handleExport = async () => {
    if (!validateExport()) return;

    setLoading(true);
    try {
      // Determine which data to export based on scope
      let exportData = data;
      let scopeDescription = 'all data';
      
      switch (exportScope) {
        case 'all':
          // Fetch all data from database
          if (exportType === 'companies') {
            const { data: allCompanies, error } = await getAllCompaniesForExport(filters);
            if (error) {
              setError('Failed to fetch all companies: ' + error.message);
              setLoading(false);
              return;
            }
            exportData = allCompanies || [];
          } else {
            const { data: allRepresentatives, error } = await getAllRepresentativesForExport(filters);
            if (error) {
              setError('Failed to fetch all representatives: ' + error.message);
              setLoading(false);
              return;
            }
            exportData = allRepresentatives || [];
          }
          scopeDescription = `all data (${exportData.length} records)`;
          break;
        case 'selected':
          // Filter data to only include selected items
          exportData = data.filter(item => selectedItems.includes(item.id));
          scopeDescription = 'selected items';
          break;
        case 'filtered':
          // Data is already filtered from parent component
          scopeDescription = 'filtered data';
          break;
        case 'current':
          // Take only current page (assuming 50 per page)
          exportData = data.slice(0, 50);
          scopeDescription = 'current page';
          break;
        default:
          scopeDescription = 'all data';
      }

      // Generate CSV content
      const csvContent = await exportToCSV(
        exportData,
        selectedFields,
        exportType,
        purpose,
        currentUser.id,
        filters
      );

      // Download the file
      const fileName = `${exportType}_export_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(csvContent, fileName);

      onClose();
    } catch (err) {
      setError('Export failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export {exportType === 'companies' ? 'Companies' : 'Representatives'} CSV</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Export Scope */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export Scope</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={exportScope} onValueChange={setExportScope}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Data (fetch from database)</SelectItem>
                  <SelectItem value="filtered">Filtered Data ({data.length} records)</SelectItem>
                  <SelectItem value="current">Current Page Only (up to 50 records)</SelectItem>
                  {selectedItems.length > 0 && (
                    <SelectItem value="selected">Selected Items Only ({selectedItems.length} records)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Field Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Select Fields to Export
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedFields.length === (exportType === 'companies' ? COMPANY_EXPORT_FIELDS : REPRESENTATIVE_EXPORT_FIELDS).length}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all" className="text-sm">Select All</Label>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {(exportType === 'companies' ? COMPANY_EXPORT_FIELDS : REPRESENTATIVE_EXPORT_FIELDS).map((field) => (
                  <div key={field.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.key}
                      checked={selectedFields.includes(field.key)}
                      onCheckedChange={(checked) => handleFieldToggle(field.key, checked)}
                    />
                    <Label htmlFor={field.key} className="text-sm">
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Purpose */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purpose for Export *</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Please describe the purpose of this export (required for audit log)"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={3}
                className={error && !purpose.trim() ? 'border-red-500' : ''}
              />
              <p className="text-sm text-gray-500 mt-2">
                This information will be stored in the audit log for compliance purposes.
              </p>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            {loading ? 'Exporting...' : `Export ${selectedFields.length} Fields`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}