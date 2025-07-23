'use client';

import { useState, useEffect } from 'react';
import { Plus, Upload, Download, Edit, Trash2, Search, Filter, ExternalLink, Settings, Eye, EyeOff } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import CompanyDialog from '@/components/CompanyDialog';
import CompanyDetailModal from '@/components/CompanyDetailModal';
import CSVImportModal from '@/components/CSVImportModal';
import CSVExportModal from '@/components/CSVExportModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getCompanies, createCompany, updateCompany, deleteCompany, bulkDeleteCompanies } from '@/lib/companies';
import { getUsers } from '@/lib/users';
import { getCurrentUserWithRole } from '@/lib/auth';
import { subscribeToCompanies, handleCompanyUpdate, unsubscribeFromChannel } from '@/lib/realtime';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'No Status', label: 'No Status' },
  { value: 'No Reply', label: 'No Reply' },
  { value: 'Not Interested', label: 'Not Interested' },
  { value: 'Contacted', label: 'Contacted' },
  { value: 'Not a Fit', label: 'Not a Fit' },
  { value: 'Asked to Reach Out Later', label: 'Asked to Reach Out Later' },
  { value: 'Declined', label: 'Declined' },
  { value: 'Client', label: 'Client' },
  { value: 'Pending Connection', label: 'Pending Connection' }
];

const TABLE_COLUMNS = [
  { key: 'company', label: 'Company', required: true },
  { key: 'industry', label: 'Industry', required: false },
  { key: 'location', label: 'Location', required: false },
  { key: 'source', label: 'Source', required: false },
  { key: 'linkedin_url', label: 'LinkedIn URL', required: false },
  { key: 'website', label: 'Website', required: false },
  { key: 'number_of_employees', label: 'Number of Employees', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'last_activity_date', label: 'Last Activity Date', required: false },
  { key: 'assigned_to', label: 'Assigned To', required: false },
  { key: 'representatives', label: 'Representatives', required: false }
];

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [realtimeSubscription, setRealtimeSubscription] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState({
    company: true,
    industry: false,
    location: false,
    source: false,
    linkedin_url: false,
    website: false,
    number_of_employees: false,
    status: true,
    last_activity_date: true,
    assigned_to: true,
    representatives: true
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    assigned_to: '',
    unread_filter: '',
    sort_field: 'created_at',
    sort_order: 'desc'
  });

  useEffect(() => {
    fetchData();
    fetchUsers();
    getCurrentUser();
    
    // Set up real-time subscription
    const subscription = subscribeToCompanies((payload) => {
      handleCompanyUpdate(payload, companies, setCompanies);
    });
    setRealtimeSubscription(subscription);
    
    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        unsubscribeFromChannel(subscription);
      }
    };
  }, [currentPage, filters]);

  const getCurrentUser = async () => {
    const user = await getCurrentUserWithRole();
    setCurrentUser(user);
  };

  const fetchUsers = async () => {
    const { data } = await getUsers();
    setUsers(data || []);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, count } = await getCompanies(currentPage, 50, filters);
      setCompanies(data || []);
      setTotalPages(Math.ceil((count || 0) / 50));
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = () => {
    setEditingCompany(null);
    setDialogOpen(true);
  };

  const handleEditCompany = (company) => {
    setEditingCompany(company);
    setDialogOpen(true);
  };

  const handleDeleteCompany = async (company) => {
    if (window.confirm(`Are you sure you want to delete ${company.company_name}?`)) {
      const { error } = await deleteCompany(company.id, currentUser.id);
      if (!error) {
        fetchData();
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCompanies.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedCompanies.length} companies?`)) {
      const { error } = await bulkDeleteCompanies(selectedCompanies, currentUser.id);
      if (!error) {
        setSelectedCompanies([]);
        fetchData();
      }
    }
  };

  const handleSaveCompany = async (companyData) => {
    setSaving(true);
    try {
      let result;
      if (editingCompany) {
        result = await updateCompany(editingCompany.id, companyData, currentUser.id);
      } else {
        result = await createCompany(companyData, currentUser.id);
      }

      if (!result.error) {
        setDialogOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error saving company:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectCompany = (companyId, checked) => {
    if (checked) {
      setSelectedCompanies([...selectedCompanies, companyId]);
    } else {
      setSelectedCompanies(selectedCompanies.filter(id => id !== companyId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedCompanies(companies.map(c => c.id));
    } else {
      setSelectedCompanies([]);
    }
  };

  const handleFilterChange = (key, value) => {
    const filterValue = value === 'all' || value === 'all_assignees' ? '' : value;
    setFilters(prev => ({ ...prev, [key]: filterValue }));
    setCurrentPage(1);
  };

  const handleImportComplete = (importedCount) => {
    fetchData();
    // Show success message or toast
    console.log(`Successfully imported ${importedCount} companies`);
  };

  const handleCompanyClick = (companyId) => {
    // Mark company as read when clicked
    markCompanyAsRead(companyId);
    setSelectedCompanyId(companyId);
    setDetailModalOpen(true);
  };

  const markCompanyAsRead = async (companyId) => {
    const { error } = await updateCompany(companyId, { mark_unread: false }, currentUser.id);
    if (!error) {
      // Update local state to reflect the change
      setCompanies(prev => prev.map(company => 
        company.id === companyId ? { ...company, mark_unread: false } : company
      ));
    }
  };

  const handleColumnToggle = (columnKey, checked) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: checked
    }));
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Client':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Contacted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pending Connection':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Declined':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Not Interested':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canEdit = currentUser?.role === 'Admin' || currentUser?.role === 'Editor';
  const canDelete = currentUser?.role === 'Admin';

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
                <p className="mt-2 text-gray-600">
                  Manage your company database and track lead progress
                </p>
              </div>
              <div className="flex space-x-3">
              </div>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search companies..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filters.assigned_to} onValueChange={(value) => handleFilterChange('assigned_to', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_assignees">All Assignees</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filters.unread_filter} onValueChange={(value) => handleFilterChange('unread_filter', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by read status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_read_status">All</SelectItem>
                    <SelectItem value="unread_only">Unread Only</SelectItem>
                    <SelectItem value="read_only">Read Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Sorting Controls */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Sort Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Label className="text-sm font-medium text-gray-700">Sort by:</Label>
                  <Select value={filters.sort_field} onValueChange={(value) => handleFilterChange('sort_field', value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company_name">Company Name</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="created_at">Created At</SelectItem>
                      <SelectItem value="updated_at">Modified At</SelectItem>
                      <SelectItem value="last_activity_date">Last Activity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant={filters.sort_order === 'asc' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange('sort_order', 'asc')}
                    className="px-3"
                  >
                    ↑ ASC
                  </Button>
                  <Button
                    variant={filters.sort_order === 'desc' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange('sort_order', 'desc')}
                    className="px-3"
                  >
                    ↓ DESC
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Customize Table
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64" align="start">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-sm mb-3">Show/Hide Columns</h4>
                          <div className="space-y-3">
                            {TABLE_COLUMNS.map((column) => (
                              <div key={column.key} className="flex items-center space-x-2">
                                <Checkbox
                                  id={column.key}
                                  checked={visibleColumns[column.key]}
                                  onCheckedChange={(checked) => handleColumnToggle(column.key, checked)}
                                  disabled={column.required}
                                />
                                <Label 
                                  htmlFor={column.key} 
                                  className={`text-sm ${column.required ? 'text-gray-500' : 'cursor-pointer'}`}
                                >
                                  {column.label}
                                  {column.required && ' (Required)'}
                                </Label>
                                {visibleColumns[column.key] ? (
                                  <Eye className="h-3 w-3 text-green-600" />
                                ) : (
                                  <EyeOff className="h-3 w-3 text-gray-400" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="pt-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setVisibleColumns({
                              company: true,
                              industry: true,
                              location: true,
                              source: true,
                              linkedin_url: true,
                              website: true,
                              number_of_employees: true,
                              status: true,
                              last_activity_date: true,
                              assigned_to: true,
                              representatives: true
                            })}
                            className="w-full"
                          >
                            Show All Columns
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex space-x-3">
                <Button variant="outline" onClick={() => setImportModalOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Companies CSV
                </Button>
                <Button variant="outline" onClick={() => setExportModalOpen(true)}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                {canEdit && (
                  <Button onClick={handleAddCompany} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Company
                  </Button>
                )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selectedCompanies.length > 0 && canDelete && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800">
                  {selectedCompanies.length} companies selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          )}

          {/* Companies Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : companies.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">🏢</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No companies found</h3>
                  <p className="text-gray-500 mb-4">Get started by adding your first company.</p>
                  {canEdit && (
                    <Button onClick={handleAddCompany}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Company
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 relative">
                    <thead className="bg-gray-50">
                      <tr>
                        {canDelete && (
                          <th className="px-6 py-3 text-left sticky left-0 bg-gray-50 z-10">
                            <Checkbox
                              checked={selectedCompanies.length === companies.length}
                              onCheckedChange={handleSelectAll}
                            />
                          </th>
                        )}
                        <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 ${canDelete ? 'left-14' : 'left-0'}`}>
                          Company
                        </th>
                        {visibleColumns.industry && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                            Industry
                          </th>
                        )}
                        {visibleColumns.location && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                            Location
                          </th>
                        )}
                        {visibleColumns.source && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                            Source
                          </th>
                        )}
                        {visibleColumns.linkedin_url && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                            LinkedIn
                          </th>
                        )}
                        {visibleColumns.website && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                            Website
                          </th>
                        )}
                        {visibleColumns.number_of_employees && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                            Employees
                          </th>
                        )}
                        {visibleColumns.status && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        )}
                        {visibleColumns.last_activity_date && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                            Last Activity
                          </th>
                        )}
                        {visibleColumns.assigned_to && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Assigned To
                          </th>
                        )}
                        {visibleColumns.representatives && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Representatives
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {companies.map((company) => (
                        <tr key={company.id} className={`hover:bg-gray-50 ${company.mark_unread ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}>
                          {canDelete && (
                            <td className={`px-6 py-4 sticky left-0 z-10 ${company.mark_unread ? 'bg-blue-50 hover:bg-gray-50' : 'bg-white hover:bg-gray-50'}`}>
                              <Checkbox
                                checked={selectedCompanies.includes(company.id)}
                                onCheckedChange={(checked) => handleSelectCompany(company.id, checked)}
                              />
                            </td>
                          )}
                          <td className={`px-6 py-4 whitespace-nowrap sticky z-10 ${canDelete ? 'left-20' : 'left-0'} ${company.mark_unread ? 'bg-blue-50 hover:bg-gray-50' : 'bg-white hover:bg-gray-50'}`}>
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                                  <span className="text-sm font-medium text-white">
                                    {company.company_name?.charAt(0)}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4 flex-1 flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => handleCompanyClick(company.id)}
                                        className="text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left"
                                      >
                                        {company.company_name}
                                      </button>
                                      {company.linkedin_url && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const url = company.linkedin_url.startsWith('http') 
                                              ? company.linkedin_url 
                                              : `https://${company.linkedin_url}`;
                                            window.open(url, '_blank', 'noopener,noreferrer');
                                          }}
                                          className="text-blue-600 hover:text-blue-800 transition-colors"
                                          title="Open LinkedIn Profile"
                                        >
                                          <img 
                                            src="/linkedinicon.webp" 
                                            alt="LinkedIn" 
                                            className="h-4 w-4 hover:opacity-80 transition-opacity"
                                          />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {company.number_of_employees ? `${company.number_of_employees} employees` : 'Size unknown'}
                                  </div>
                                </div>
                                <div className="flex items-center justify-center space-x-3">
                                  {canEdit && (
                                    <button
                                      onClick={() => handleEditCompany(company)}
                                      className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
                                      title="Edit Company"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      onClick={() => handleDeleteCompany(company)}
                                      className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
                                      title="Delete Company"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          {visibleColumns.industry && (
                            <td className="px-4 py-4 text-sm text-gray-900 truncate max-w-32">
                              {company.industry || 'N/A'}
                            </td>
                          )}
                          {visibleColumns.location && (
                            <td className="px-4 py-4 text-sm text-gray-900 truncate max-w-28">
                              {company.location || 'N/A'}
                            </td>
                          )}
                          {visibleColumns.source && (
                            <td className="px-4 py-4 text-sm text-gray-900 truncate max-w-32">
                              {company.source || 'N/A'}
                            </td>
                          )}
                          {visibleColumns.linkedin_url && (
                            <td className="px-4 py-4 text-sm truncate max-w-32">
                              {company.linkedin_url ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const url = company.linkedin_url.startsWith('http') 
                                      ? company.linkedin_url 
                                      : `https://${company.linkedin_url}`;
                                    window.open(url, '_blank', 'noopener,noreferrer');
                                  }}
                                  className="text-blue-600 hover:text-blue-800 transition-colors flex items-center"
                                  title="Open LinkedIn Profile"
                                >
                                  <img 
                                    src="/linkedinicon.webp" 
                                    alt="LinkedIn" 
                                    className="h-4 w-4 hover:opacity-80 transition-opacity"
                                  />
                                </button>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                          )}
                          {visibleColumns.website && (
                            <td className="px-4 py-4 text-sm truncate max-w-32">
                              {company.website ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const url = company.website.startsWith('http') 
                                      ? company.website 
                                      : `https://${company.website}`;
                                    window.open(url, '_blank', 'noopener,noreferrer');
                                  }}
                                  className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                  title="Visit Website"
                                >
                                  Visit
                                </button>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                          )}
                          {visibleColumns.number_of_employees && (
                            <td className="px-4 py-4 text-sm text-gray-900 truncate max-w-28">
                              {company.number_of_employees || 'N/A'}
                            </td>
                          )}
                          {visibleColumns.status && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              {company.status ? (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(company.status)}`}>
                                  {company.status}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">No status</span>
                              )}
                            </td>
                          )}
                          {visibleColumns.last_activity_date && (
                            <td className="px-4 py-4 text-sm text-gray-900 truncate max-w-32">
                              {company.last_activity_date ? new Date(company.last_activity_date).toLocaleDateString() : 'N/A'}
                            </td>
                          )}
                          {visibleColumns.assigned_to && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {company.assigned_user ? 
                                `${company.assigned_user.first_name} ${company.assigned_user.last_name}` : 
                                <span className="text-gray-400">Unassigned</span>
                              }
                            </td>
                          )}
                          {visibleColumns.representatives && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {company.representatives?.length || 0} reps
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Company Dialog */}
          <CompanyDialog
            isOpen={dialogOpen}
            onClose={() => setDialogOpen(false)}
            onSave={handleSaveCompany}
            company={editingCompany}
            loading={saving}
          />

          {/* Company Detail Modal */}
          <CompanyDetailModal
            isOpen={detailModalOpen}
            onClose={() => setDetailModalOpen(false)}
            companyId={selectedCompanyId}
          />
        </main>
          {/* CSV Import Modal */}
          <CSVImportModal
            isOpen={importModalOpen}
            onClose={() => setImportModalOpen(false)}
            onImportComplete={handleImportComplete}
          />

          {/* CSV Export Modal */}
          <CSVExportModal
            isOpen={exportModalOpen}
            onClose={() => setExportModalOpen(false)}
            data={companies}
            exportType="companies"
            selectedItems={selectedCompanies}
          />
      </div>
    </ProtectedRoute>
  );
}