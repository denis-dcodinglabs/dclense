'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getUsers } from '@/lib/users';
import { getCompanies } from '@/lib/companies';

export default function RepresentativeDialog({ isOpen, onClose, onSave, representative = null, loading = false, preselectedCompanyId = null }) {
  const [formData, setFormData] = useState({
    company_id: '',
    first_name: '',
    last_name: '',
    role: '',
    linkedin_profile_url: '',
    method_of_contact: '',
    contact_source: '',
    status: '',
    contact_date: '',
    follow_up_dates: [],
    reminder_date: '',
    outcome: '',
    notes: '',
    contacted_by: '',
    assigned_to: '',
    mark_unread: true
  });
  const [errors, setErrors] = useState({});
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [followUpDate, setFollowUpDate] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (representative) {
      setFormData({
        company_id: representative.company_id || '',
        first_name: representative.first_name || '',
        last_name: representative.last_name || '',
        role: representative.role || '',
        linkedin_profile_url: representative.linkedin_profile_url || '',
        method_of_contact: representative.method_of_contact || '',
        contact_source: representative.contact_source || '',
        status: representative.status || '',
        contact_date: representative.contact_date ? representative.contact_date.split('T')[0] : '',
        follow_up_dates: representative.follow_up_dates || [],
        reminder_date: representative.reminder_date ? representative.reminder_date.split('T')[0] : '',
        outcome: representative.outcome || '',
        notes: representative.notes || '',
        contacted_by: representative.contacted_by || '',
        assigned_to: representative.assigned_to || '',
        mark_unread: false
      });
    } else {
      setFormData({
        company_id: preselectedCompanyId || '',
        first_name: '',
        last_name: '',
        role: '',
        linkedin_profile_url: '',
        method_of_contact: '',
        contact_source: '',
      status: '',
        contact_date: '',
        follow_up_dates: [],
        reminder_date: '',
        outcome: '',
        notes: '',
        contacted_by: '',
        assigned_to: '',
        mark_unread: true
      });
    }
    setErrors({});
  }, [representative, isOpen, preselectedCompanyId]);

  const fetchUsers = async () => {
    const { data } = await getUsers();
    setUsers(data || []);
  };

  const fetchCompanies = async () => {
    const { data } = await getCompanies(1, 1000); // Get all companies for dropdown
    setCompanies(data || []);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Construct full_name from first_name and last_name
      const fullName = `${formData.first_name} ${formData.last_name}`.trim();
      
      const submitData = {
        ...formData,
        full_name: fullName,
        company_id: formData.company_id || null,
        contact_date: formData.contact_date || null,
        reminder_date: formData.reminder_date || null,
        contacted_by: formData.contacted_by || null,
        assigned_to: formData.assigned_to || null
      };
      onSave(submitData);
    }
  };

  const handleInputChange = (field, value) => {
    // Handle special case for company selection
    if (field === 'company_id' && value === 'null_company_option') {
      value = '';
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addFollowUpDate = () => {
    if (followUpDate) {
      setFormData(prev => ({
        ...prev,
        follow_up_dates: [...prev.follow_up_dates, followUpDate]
      }));
      setFollowUpDate('');
    }
  };

  const removeFollowUpDate = (index) => {
    setFormData(prev => ({
      ...prev,
      follow_up_dates: prev.follow_up_dates.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {representative ? 'Edit Representative' : 'Add New Representative'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_id">Company</Label>
              <Select value={formData.company_id} onValueChange={(value) => handleInputChange('company_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null_company_option">No company</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                placeholder="Enter first name"
                className={errors.first_name ? 'border-red-500' : ''}
              />
              {errors.first_name && (
                <p className="text-sm text-red-500">{errors.first_name}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                placeholder="Enter last name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                placeholder="Enter role"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="No Status">No Status</SelectItem>
                  <SelectItem value="No Reply">No Reply</SelectItem>
                  <SelectItem value="Not Interested">Not Interested</SelectItem>
                  <SelectItem value="Contacted">Contacted</SelectItem>
                  <SelectItem value="In Communication">In Communication</SelectItem>
                  <SelectItem value="Not a Fit">Not a Fit</SelectItem>
                  <SelectItem value="Asked to Reach Out Later">Asked to Reach Out Later</SelectItem>
                  <SelectItem value="Declined">Declined</SelectItem>
                  <SelectItem value="Client">Client</SelectItem>
                  <SelectItem value="Pending Connection">Pending Connection</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin_profile_url">LinkedIn Profile URL</Label>
            <Input
              id="linkedin_profile_url"
              value={formData.linkedin_profile_url}
              onChange={(e) => handleInputChange('linkedin_profile_url', e.target.value)}
              placeholder="Enter LinkedIn profile URL"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="method_of_contact">Method of Contact</Label>
              <Input
                id="method_of_contact"
                value={formData.method_of_contact}
                onChange={(e) => handleInputChange('method_of_contact', e.target.value)}
                placeholder="Enter method of contact"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact_source">Contact Origin</Label>
              <Input
                id="contact_source"
                value={formData.contact_source}
                onChange={(e) => handleInputChange('contact_source', e.target.value)}
                placeholder="Enter contact origin"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_date">Contact Date</Label>
              <Input
                id="contact_date"
                type="date"
                value={formData.contact_date}
                onChange={(e) => handleInputChange('contact_date', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder_date">Reminder Date</Label>
            <Input
              id="reminder_date"
              type="date"
              value={formData.reminder_date}
              onChange={(e) => handleInputChange('reminder_date', e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Set a date to be reminded about this representative
            </p>
          </div>

          <div className="space-y-2">
            <Label>Follow-up Dates</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                placeholder="Add follow-up date"
              />
              <Button type="button" onClick={addFollowUpDate} variant="outline">
                Add
              </Button>
            </div>
            {formData.follow_up_dates.length > 0 && (
              <div className="space-y-1">
                {formData.follow_up_dates.map((date, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span>{new Date(date).toLocaleDateString()}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFollowUpDate(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="outcome">Outcome</Label>
              <Input
                id="outcome"
                value={formData.outcome}
                onChange={(e) => handleInputChange('outcome', e.target.value)}
                placeholder="Enter outcome"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contacted_by">Contacted By</Label>
              <Select value={formData.contacted_by} onValueChange={(value) => handleInputChange('contacted_by', value === 'not_contacted' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_contacted">Not contacted</SelectItem>
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
            <Label htmlFor="assigned_to">Assigned To</Label>
            <Select value={formData.assigned_to} onValueChange={(value) => handleInputChange('assigned_to', value === 'unassigned' ? '' : value)}>
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
              Unread representatives are highlighted and can be filtered
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
              {loading ? 'Saving...' : (representative ? 'Update Representative' : 'Add Representative')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}