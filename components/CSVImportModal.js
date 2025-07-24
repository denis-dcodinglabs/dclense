'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Save, Download, Trash2, AlertCircle } from 'lucide-react';
import { parseCSV, getCSVTemplates, saveCSVTemplate, deleteCSVTemplate, importCompaniesFromCSV, importRepresentativesFromCSV } from '@/lib/csvUtils';
import { getCurrentUserWithRole } from '@/lib/auth';

const COMPANY_FIELDS = [
  { key: 'company_name', label: 'Company Name *', required: true },
  { key: 'industry', label: 'Industry', required: false },
  { key: 'location', label: 'Location', required: false },
  { key: 'linkedin_url', label: 'LinkedIn URL', required: false },
  { key: 'website', label: 'Website', required: false },
  { key: 'source', label: 'Source', required: false },
  { key: 'number_of_employees', label: 'Number of Employees', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'notes', label: 'Notes', required: false },
  { key: 'last_activity_date', label: 'Last Activity Date', required: false },
  { key: 'assigned_to', label: 'Assigned To (Email)', required: false }
];

const REPRESENTATIVE_FIELDS = [
  { key: 'company_name', label: 'Company Name', required: false },
  { key: 'first_name', label: 'First Name *', required: true },
  { key: 'last_name', label: 'Last Name', required: false },
  { key: 'role', label: 'Role', required: false },
  { key: 'linkedin_profile_url', label: 'LinkedIn Profile URL', required: false },
  { key: 'contact_source', label: 'Contact Source', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'contact_date', label: 'Contact Date', required: false },
  { key: 'outcome', label: 'Outcome', required: false },
  { key: 'notes', label: 'Notes', required: false },
  { key: 'contacted_by', label: 'Contacted By (Email)', required: false },
  { key: 'assigned_to', label: 'Assigned To (Email)', required: false }
];

export default function CSVImportModal({ isOpen, onClose, onImportComplete, importType = 'companies' }) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Map, 3: Review
  const [csvFile, setCsvFile] = useState(null);
  const [csvData, setCsvData] = useState({ headers: [], rows: [] });
  const [fieldMappings, setFieldMappings] = useState({});
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [previewData, setPreviewData] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      getCurrentUser();
      resetState();
    }
  }, [isOpen]);

  const getCurrentUser = async () => {
    const user = await getCurrentUserWithRole();
    setCurrentUser(user);
  };

  const fetchTemplates = async () => {
    const { data } = await getCSVTemplates(importType);
    setTemplates(data || []);
  };

  const resetState = () => {
    setStep(1);
    setCsvFile(null);
    setCsvData({ headers: [], rows: [] });
    setFieldMappings({});
    setSelectedTemplate('');
    setTemplateName('');
    setSaveTemplate(false);
    setError('');
    setPreviewData([]);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file');
      return;
    }

    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target.result;
        const parsed = parseCSV(csvText);
        setCsvData(parsed);
        setError('');
        
        // Auto-generate template name from file name
        const fileName = file.name.replace('.csv', '');
        setTemplateName(fileName);
        
        setStep(2);
      } catch (err) {
        setError('Error parsing CSV file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(templateId);
    if (templateId && templateId !== 'new') {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setFieldMappings(template.field_mappings || {});
        setTemplateName(template.template_name);
        setError('');
      }
    } else {
      setFieldMappings({});
      setTemplateName('');
    }
  };

  const handleFieldMapping = (dbField, csvColumn) => {
    setFieldMappings(prev => ({
      ...prev,
      [dbField]: csvColumn === 'unmapped' ? '' : csvColumn
    }));
  };

  const generatePreview = () => {
    if (!checkValidationAndSetError()) return;
    
    const preview = csvData.rows.slice(0, 5).map(row => {
      const mappedRow = {};
      COMPANY_FIELDS.forEach(field => {
        const csvColumn = fieldMappings[field.key];
        mappedRow[field.key] = csvColumn ? row[csvColumn] : '';
      });
      return mappedRow;
    });
    setPreviewData(preview);
    setStep(3);
  };

  const validateMappings = () => {
    const fields = importType === 'companies' ? COMPANY_FIELDS : REPRESENTATIVE_FIELDS;
    const requiredFields = fields.filter(f => f.required);
    const missingFields = requiredFields.filter(field => !fieldMappings[field.key]);
    
    return missingFields.length === 0;
  };

  const checkValidationAndSetError = () => {
    const fields = importType === 'companies' ? COMPANY_FIELDS : REPRESENTATIVE_FIELDS;
    const requiredFields = fields.filter(f => f.required);
    const missingFields = requiredFields.filter(field => !fieldMappings[field.key]);
    
    if (missingFields.length > 0) {
      setError(`Please map required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return false;
    }
    
    setError('');
    return true;
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      setError('Please enter a template name');
      return;
    }

    const templateData = {
      template_name: templateName,
      template_type: importType,
      field_mappings: fieldMappings
    };

    const { data, error } = await saveCSVTemplate(templateData, currentUser.id);
    if (error) {
      setError('Failed to save template');
    } else {
      await fetchTemplates();
      // Update selected template to the newly created one
      if (data) {
        setSelectedTemplate(data.id);
      }
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      const { error } = await deleteCSVTemplate(templateId);
      if (!error) {
        await fetchTemplates();
        if (selectedTemplate === templateId) {
          setSelectedTemplate('');
          setFieldMappings({});
        }
      }
    }
  };

  const handleImport = async () => {
    if (!checkValidationAndSetError()) return;

    setLoading(true);
    try {
      // Save template if requested
      if (saveTemplate && templateName.trim()) {
        await handleSaveTemplate();
      }

      // Transform CSV data according to mappings
      const mappedData = csvData.rows.map(row => {
        const mappedRow = {};
        const fields = importType === 'companies' ? COMPANY_FIELDS : REPRESENTATIVE_FIELDS;
        fields.forEach(field => {
          const csvColumn = fieldMappings[field.key];
          let value = csvColumn ? row[csvColumn] : null;
          
          // Handle special field transformations
          if (field.key === 'number_of_employees' && value && importType === 'companies') {
            value = value || null;
          }
          if ((field.key === 'assigned_to' || field.key === 'contacted_by') && value) {
            // This would need to be resolved to user ID in the backend
            // For now, we'll pass the email and resolve it server-side
            mappedRow[field.key] = value;
          } else {
            mappedRow[field.key] = value || null;
          }
        });
        return mappedRow;
      });

      let result;
      if (importType === 'companies') {
        result = await importCompaniesFromCSV(mappedData, currentUser.id);
      } else {
        result = await importRepresentativesFromCSV(mappedData, currentUser.id);
      }
      
      if (result.error) {
        setError('Import failed: ' + result.error.message);
      } else {
        onImportComplete(result.data.length);
        onClose();
      }
    } catch (err) {
      setError('Import failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const fields = importType === 'companies' ? COMPANY_FIELDS : REPRESENTATIVE_FIELDS;
    const headers = fields.map(f => f.label.replace(' *', '')).join(',');
    const sampleRow = fields.map(f => {
      switch (f.key) {
        case 'company_name': return 'Example Company Inc';
        case 'first_name': return 'John';
        case 'last_name': return 'Doe';
        case 'industry': return 'Technology';
        case 'role': return 'CEO';
        case 'location': return 'New York, NY';
        case 'number_of_employees': return '100';
        case 'status': return 'Contacted';
        case 'outcome': return 'Interested';
        case 'contact_date': return '2024-01-15';
        default: return '';
      }
    }).join(',');
    
    const csvContent = `${headers}\n${sampleRow}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${importType}_template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import {importType === 'companies' ? 'Companies' : 'Representatives'} CSV</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <Label htmlFor="csv-upload" className="cursor-pointer text-blue-600 hover:text-blue-700">
                    Click to upload CSV file
                  </Label>
                  <Input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <p className="text-sm text-gray-500">or drag and drop your CSV file here</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>

            {templates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Import with Saved Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Select a template to automatically map your CSV columns and skip the mapping step.
                  </p>
                  <div className="space-y-4">
                    {templates.map((template) => (
                      <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{template.template_name}</h4>
                          <p className="text-sm text-gray-500">
                            Created {new Date(template.created_at).toLocaleDateString()} • 
                            {Object.keys(template.field_mappings || {}).length} field mappings
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant={selectedTemplate === template.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleTemplateSelect(template.id)}
                            disabled={csvData.headers.length === 0}
                          >
                            {selectedTemplate === template.id ? 'Selected' : 'Use Template'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {csvData.headers.length === 0 && (
                    <p className="text-sm text-amber-600 mt-4 p-3 bg-amber-50 rounded-lg">
                      💡 Upload a CSV file first to use templates for automatic mapping
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {/* Template Selection Dropdown */}
            {templates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Use Saved Template</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a saved template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No template</SelectItem>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.template_name} ({Object.keys(template.field_mappings || {}).length} mappings)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedTemplate && selectedTemplate !== '' && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                          ✅ Template "{templates.find(t => t.id === selectedTemplate)?.template_name}" applied successfully!
                          Field mappings have been automatically set.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Template Selection Dropdown */}
            {templates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Use Saved Template</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a saved template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No template</SelectItem>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.template_name} ({Object.keys(template.field_mappings || {}).length} mappings)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedTemplate && selectedTemplate !== '' && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                          ✅ Template "{templates.find(t => t.id === selectedTemplate)?.template_name}" applied successfully!
                          Field mappings have been automatically set.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Map CSV Columns to Database Fields</h3>
              <p className="text-sm text-gray-500">
                {csvData.rows.length} rows detected
              </p>
            </div>

            <div className="grid gap-4">
              {(importType === 'companies' ? COMPANY_FIELDS : REPRESENTATIVE_FIELDS).map((field) => (
                <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                    }
                    
                    
                    
                    
                    
                    
                  
                    
                    
                    
                  </Label>
                  <Select
                    value={fieldMappings[field.key] || 'unmapped'}
                    onValueChange={(value) => handleFieldMapping(field.key, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select CSV column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unmapped">Don't map</SelectItem>
                      {csvData.headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Save Mapping as Template</CardTitle>
                <p className="text-sm text-gray-600">Save this field mapping configuration for future imports</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="save-template"
                    checked={saveTemplate}
                    onChange={(e) => setSaveTemplate(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="save-template">Save this mapping as a template</Label>
                </div>
                {saveTemplate && (
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      placeholder="e.g., Salesforce Export, Standard Company Import"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      Give your template a descriptive name so you can easily find it later
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Preview Import Data</h3>
            
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {COMPANY_FIELDS.filter(f => fieldMappings[f.key]).map((field) => (
                        <th key={field.key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          {field.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((row, index) => (
                      <tr key={index}>
                        {(importType === 'companies' ? COMPANY_FIELDS : REPRESENTATIVE_FIELDS).filter(f => fieldMappings[f.key]).map((field) => (
                          <td key={field.key} className="px-4 py-2 text-sm text-gray-900">
                            {row[field.key] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Showing first 5 rows. Total rows to import: {csvData.rows.length}
            </p>
          </div>
        )}

        <DialogFooter>
          <div className="flex justify-between w-full">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {step === 1 && csvData.headers.length === 0 && (
                <Button disabled>
                  Upload CSV to Continue
                </Button>
              )}
              {step === 2 && (
                <Button onClick={generatePreview} disabled={!validateMappings()}>
                  Preview Import
                </Button>
              )}
              {step === 3 && (
                <Button onClick={handleImport} disabled={loading}>
                  {loading ? 'Importing...' : `Import ${csvData.rows.length} ${importType === 'companies' ? 'Companies' : 'Representatives'}`}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}