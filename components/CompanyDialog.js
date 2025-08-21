'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getUsers } from '@/lib/users';
import { checkCompanyNameExists } from '@/lib/companies';
import CompanyDetailModal from './CompanyDetailModal';

const STATUS_OPTIONS = [
  { value: 'No Status', label: 'No Status' },
  { value: 'Declined', label: 'Declined' },
  { value: 'Company Not a Fit', label: 'Company Not a Fit' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Client', label: 'Client' },
  { value: 'Revisit Later', label: 'Revisit Later' },
  { value: 'No Reply', label: 'No Reply' }
];

export default function CompanyDialog({ isOpen, onClose, onSave, company = null, loading = false }) {
  const [formData, setFormData] = useState({
    company_name: '',
    industry: '',
    location: '',
    linkedin_url: '',
    website: '',
    source: '',
    number_of_employees: '',
    status: '',
    notes: '',
    last_activity_date: '',
    assigned_to: '',
    mark_unread: true
  });
  const [errors, setErrors] = useState({});
  const [users, setUsers] = useState([]);
  const [existingCompany, setExistingCompany] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (company) {
      setFormData({
        company_name: company.company_name || '',
        industry: company.industry || '',
        location: company.location || '',
        linkedin_url: company.linkedin_url || '',
        website: company.website || '',
        source: company.source || '',
        number_of_employees: company.number_of_employees || '',
        status: company.status || 'No Status',
        notes: company.notes || '',
        last_activity_date: company.last_activity_date ? company.last_activity_date.split('T')[0] : '',
        assigned_to: company.assigned_to || 'unassigned',
        mark_unread: false
      });
    } else {
      setFormData({
        company_name: '',
        industry: '',
        location: '',
        linkedin_url: '',
        website: '',
        source: '',
        number_of_employees: '',
        status: 'No Status',
        notes: '',
        last_activity_date: '',
        assigned_to: 'unassigned',
        mark_unread: true
      });
    }
    setErrors({});
    setExistingCompany(null); // Reset existing company when dialog opens/closes
  }, [company, isOpen]);

  const fetchUsers = async () => {
    const { data } = await getUsers();
    setUsers(data || []);
  };

  const validateForm = async () => {
    const newErrors = {};
    setExistingCompany(null); // Reset existing company

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    } else {
      // Check for duplicate company name
      const { exists, error, existingCompany: foundCompany } = await checkCompanyNameExists(
        formData.company_name.trim(), 
        company?.id // Exclude current company when editing
      );
      
      if (error) {
        newErrors.company_name = 'Error checking company name. Please try again.';
      } else if (exists && foundCompany) {
        newErrors.company_name = 'A company with this name already exists';
        setExistingCompany(foundCompany);
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isValid = await validateForm();
    if (isValid) {
      const submitData = {
        ...formData,
        status: formData.status === 'No Status' ? null : formData.status,
        number_of_employees: formData.number_of_employees || null,
        last_activity_date: formData.last_activity_date || null,
        assigned_to: formData.assigned_to === 'unassigned' ? null : formData.assigned_to
      };
      onSave(submitData);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    // Reset existing company when company name changes
    if (field === 'company_name') {
      setExistingCompany(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {company ? 'Edit Company' : 'Add New Company'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                placeholder="Enter company name"
                className={errors.company_name ? 'border-red-500' : ''}
              />
              {errors.company_name && (
                <div className="text-sm text-red-500">
                  {errors.company_name}
                  {existingCompany && (
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => setDetailModalOpen(true)}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        View existing company: "{existingCompany.company_name}"
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                placeholder="Enter industry"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Enter location"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="source">Contact Origin</Label>
              <Input
                id="source"
                value={formData.source}
                onChange={(e) => handleInputChange('source', e.target.value)}
                placeholder="Enter source"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input
                id="linkedin_url"
                value={formData.linkedin_url}
                onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                placeholder="Enter LinkedIn URL"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="Enter website URL"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="number_of_employees">Number of Employees</Label>
              <Input
                id="number_of_employees"
                type="text"
                value={formData.number_of_employees}
                onChange={(e) => handleInputChange('number_of_employees', e.target.value)}
                placeholder="e.g. 50-100, 1000+, 10-50"
                className={errors.number_of_employees ? 'border-red-500' : ''}
              />
              {errors.number_of_employees && (
                <p className="text-sm text-red-500">{errors.number_of_employees}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="last_activity_date">Last Activity Date</Label>
              <Input
                id="last_activity_date"
                type="date"
                value={formData.last_activity_date}
                onChange={(e) => handleInputChange('last_activity_date', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assigned To</Label>
              <Select value={formData.assigned_to} onValueChange={(value) => handleInputChange('assigned_to', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="mark_unread"
                checked={formData.mark_unread}
                onChange={(e) => handleInputChange('mark_unread', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="mark_unread">Mark as unread</Label>
            </div>
            <p className="text-xs text-gray-500">
              Unread companies are highlighted and can be filtered
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Enter notes"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (company ? 'Update Company' : 'Add Company')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      
      {/* Company Detail Modal for existing company */}
      <CompanyDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        companyId={existingCompany?.id}
        onCompanyUpdated={() => {
          // Refresh validation when existing company is updated
          setDetailModalOpen(false);
        }}
      />
    </Dialog>
  );
}