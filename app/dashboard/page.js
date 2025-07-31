'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  Upload,
  Download,
  UserPlus,
  Building2,
  TrendingUp,
  Users,
  Target,
  Activity,
  Search,
  Edit,
  Trash2,
  User,
} from 'lucide-react';
import { Settings, Eye, EyeOff, BookOpen, BookOpenCheck } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import RepresentativeDialog from '@/components/RepresentativeDialog';
import RepresentativeDetailModal from '@/components/RepresentativeDetailModal';
import CSVImportModal from '@/components/CSVImportModal';
import CSVExportModal from '@/components/CSVExportModal';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  getRepresentatives,
  deleteRepresentative,
  assignToMe,
} from '@/lib/representatives';
import {
  bulkDeleteRepresentatives,
  bulkAssignRepresentativesToMe,
} from '@/lib/representatives';
import { bulkMarkRepresentativesReadUnread } from '@/lib/representatives';
import {
  getActivityStats,
  getCompanyStatusStats,
  getConversionRates,
  getAgentPerformance,
} from '@/lib/analytics';
import { getCompanies } from '@/lib/companies';
import { getCurrentUserWithRole } from '@/lib/auth';
import {
  createRepresentative,
  updateRepresentative,
} from '@/lib/representatives';
import {
  subscribeToRepresentatives,
  handleRepresentativeUpdate,
  unsubscribeFromChannel,
} from '@/lib/realtime';

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
  { value: 'Pending Connection', label: 'Pending Connection' },
];

const INLINE_STATUS_OPTIONS = [
  { value: 'No Status', label: 'No Status' },
  { value: 'No Reply', label: 'No Reply' },
  { value: 'Not Interested', label: 'Not Interested' },
  { value: 'Contacted', label: 'Contacted' },
  { value: 'Not a Fit', label: 'Not a Fit' },
  { value: 'Asked to Reach Out Later', label: 'Asked to Reach Out Later' },
  { value: 'Declined', label: 'Declined' },
  { value: 'Client', label: 'Client' },
  { value: 'Pending Connection', label: 'Pending Connection' },
];

const TABLE_COLUMNS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'company', label: 'Company', required: false },
  { key: 'role', label: 'Role', required: false },
  {
    key: 'linkedin_profile_url',
    label: 'LinkedIn Profile URL',
    required: false,
  },
  { key: 'method_of_contact', label: 'Method of Contact', required: false },
  { key: 'contact_source', label: 'Contact Origin', required: false },
  { key: 'contact_date', label: 'Contact Date', required: false },
  { key: 'follow_up_dates', label: 'Follow-up Dates', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'outcome', label: 'Outcome', required: false },
  { key: 'reminder', label: 'Reminder', required: false },
  { key: 'contacted_by', label: 'Contacted By', required: false },
  { key: 'assigned_to', label: 'Assigned To', required: false },
  { key: 'notes', label: 'Notes', required: false },
  { key: 'created_at', label: 'Created At', required: false },
];

const READ_STATUS_OPTIONS = [
  { value: 'all_read_status', label: 'All' },
  { value: 'unread_only', label: 'Unread Only' },
  { value: 'read_only', label: 'Read Only' },
];

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [representatives, setRepresentatives] = useState([]);
  const [stats, setStats] = useState({});
  const [statusStats, setStatusStats] = useState({});
  const [conversionRates, setConversionRates] = useState([]);
  const [agentPerformance, setAgentPerformance] = useState([]);
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRep, setEditingRep] = useState(null);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedRepresentatives, setSelectedRepresentatives] = useState([]);
  const [repDetailModalOpen, setRepDetailModalOpen] = useState(false);
  const [selectedRepId, setSelectedRepId] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 50;
  const [realtimeSubscription, setRealtimeSubscription] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    company: true,
    role: true,
    linkedin_profile_url: false,
    method_of_contact: false,
    contact_source: false,
    contact_date: false,
    follow_up_dates: false,
    status: true,
    outcome: false,
    reminder: true,
    contacted_by: false,
    assigned_to: true,
    notes: false,
    created_at: false,
  });
  const [filters, setFilters] = useState({
    search: '',
    company_ids: [], // Array for multi-select
    assigned_to: '',
    status: '',
    contacted_by: [],
    unread_filter: '',
    rep_position: '',
    exported_filter: '',
    sort_field: 'created_at',
    sort_order: 'desc',
  });

  useEffect(() => {
    fetchData();
    fetchCompanies();
    fetchUsers();
    getCurrentUser();

    // Check for repId in URL parameters
    const repIdFromUrl = searchParams.get('repId');
    if (repIdFromUrl) {
      setSelectedRepId(repIdFromUrl);
      setRepDetailModalOpen(true);
    }

    // Set up real-time subscription
    const subscription = subscribeToRepresentatives((payload) => {
      handleRepresentativeUpdate(payload, representatives, setRepresentatives);
      // Also refresh stats when data changes
      fetchStats();
    });
    setRealtimeSubscription(subscription);

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        unsubscribeFromChannel(subscription);
      }
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [currentPage, filters]);

  const fetchStats = async () => {
    try {
      const [statsResult, statusResult, conversionResult, performanceResult] =
        await Promise.all([
          getActivityStats(),
          getCompanyStatusStats(),
          getConversionRates(),
          getAgentPerformance(),
        ]);

      setStats(statsResult.data || {});
      setStatusStats(statusResult.data || {});
      setConversionRates(conversionResult.data || []);
      setAgentPerformance(performanceResult.data || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getCurrentUser = async () => {
    const user = await getCurrentUserWithRole();
    setCurrentUser(user);
  };

  const fetchUsers = async () => {
    const { getUsers } = await import('@/lib/users');
    const { data } = await getUsers();
    setUsers(data || []);
  };

  const fetchCompanies = async () => {
    const { data } = await getCompanies(1, 1000); // Get all companies for filter
    setCompanies(data || []);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [repsResult] = await Promise.all([
        getRepresentatives(currentPage, ITEMS_PER_PAGE, filters),
      ]);

      setRepresentatives(repsResult.data || []);
      setTotalCount(repsResult.count || 0);
      setTotalPages(Math.ceil((repsResult.count || 0) / ITEMS_PER_PAGE));

      // Fetch stats separately
      await fetchStats();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const filterValue =
      value === 'all' ||
      value === 'all_assignees' ||
      value === 'all_read_status' ||
      value === 'all_positions' ||
      value === 'all_exported_status'
        ? ''
        : value;
    setFilters((prev) => ({ ...prev, [key]: filterValue }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleContactedByChange = (userId, checked) => {
    setFilters((prev) => ({
      ...prev,
      contacted_by: checked
        ? [...prev.contacted_by, userId]
        : prev.contacted_by.filter((id) => id !== userId),
    }));
    setCurrentPage(1);
  };

  const clearContactedByFilter = () => {
    setFilters((prev) => ({ ...prev, contacted_by: [] }));
    setCurrentPage(1);
  };

  const handleCompanyFilterChange = (companyId, checked) => {
    setFilters((prev) => ({
      ...prev,
      company_ids: checked
        ? [...prev.company_ids, companyId]
        : prev.company_ids.filter((id) => id !== companyId),
    }));
    setCurrentPage(1);
  };

  const clearCompanyFilter = () => {
    setFilters((prev) => ({ ...prev, company_ids: [] }));
    setCurrentPage(1);
  };

  const handleColumnToggle = (columnKey, checked) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: checked,
    }));
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleAddRepresentative = () => {
    setEditingRep(null);
    setDialogOpen(true);
  };

  const handleEditRepresentative = (rep) => {
    // Mark representative as read when editing
    markRepresentativeAsRead(rep.id);
    setEditingRep(rep);
    setDialogOpen(true);
  };

  const handleDeleteRepresentative = async (rep) => {
    if (window.confirm(`Are you sure you want to delete ${rep.full_name}?`)) {
      const { error } = await deleteRepresentative(rep.id, currentUser.id);
      if (!error) {
        fetchData();
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRepresentatives.length === 0) return;

    if (
      window.confirm(
        `Are you sure you want to delete ${selectedRepresentatives.length} representatives?`,
      )
    ) {
      const { error } = await bulkDeleteRepresentatives(
        selectedRepresentatives,
        currentUser.id,
      );
      if (!error) {
        setSelectedRepresentatives([]);
        fetchData();
      }
    }
  };

  const handleBulkAssignToMe = async () => {
    if (selectedRepresentatives.length === 0) return;

    if (
      window.confirm(
        `Are you sure you want to assign ${selectedRepresentatives.length} representatives to yourself?`,
      )
    ) {
      const { error } = await bulkAssignRepresentativesToMe(
        selectedRepresentatives,
        currentUser.id,
      );
      if (!error) {
        setSelectedRepresentatives([]);
        fetchData();
      }
    }
  };

  const handleBulkMarkReadUnread = async (markUnread) => {
    if (selectedRepresentatives.length === 0) return;

    const action = markUnread ? 'mark as unread' : 'mark as read';
    if (
      window.confirm(
        `Are you sure you want to ${action} ${selectedRepresentatives.length} representatives?`,
      )
    ) {
      const { error } = await bulkMarkRepresentativesReadUnread(
        selectedRepresentatives,
        markUnread,
        currentUser.id,
      );
      if (!error) {
        setSelectedRepresentatives([]);
        fetchData();
      }
    }
  };

  const handleStatusChange = async (representativeId, newStatus) => {
    const statusValue = newStatus === 'No Status' ? null : newStatus;
    const { error } = await updateRepresentative(
      representativeId,
      { status: statusValue },
      currentUser.id,
    );
    if (!error) {
      // Update local state to reflect the change immediately
      setRepresentatives((prev) =>
        prev.map((rep) =>
          rep.id === representativeId ? { ...rep, status: statusValue } : rep,
        ),
      );
    }
  };

  const handleSelectRepresentative = (repId, checked) => {
    if (checked) {
      setSelectedRepresentatives([...selectedRepresentatives, repId]);
    } else {
      setSelectedRepresentatives(
        selectedRepresentatives.filter((id) => id !== repId),
      );
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRepresentatives(representatives.map((r) => r.id));
    } else {
      setSelectedRepresentatives([]);
    }
  };

  const handleSaveRepresentative = async (repData) => {
    setSaving(true);
    try {
      let result;
      if (editingRep) {
        result = await updateRepresentative(
          editingRep.id,
          repData,
          currentUser.id,
        );
      } else {
        result = await createRepresentative(repData, currentUser.id);
      }

      if (!result.error) {
        setDialogOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error saving representative:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAssignToMe = async (repId) => {
    const { error } = await assignToMe(repId, currentUser.id);
    if (!error) {
      fetchData();
    }
  };

  const handleRepresentativeClick = (repId) => {
    // Mark representative as read when viewing details
    markRepresentativeAsRead(repId);
    setSelectedRepId(repId);
    setRepDetailModalOpen(true);
    router.push(`/dashboard?repId=${repId}`, { scroll: false });
  };

  const markRepresentativeAsRead = async (repId) => {
    const { error } = await updateRepresentative(
      repId,
      { mark_unread: false },
      currentUser.id,
    );
    if (!error) {
      // Update local state to reflect the change
      setRepresentatives((prev) =>
        prev.map((rep) =>
          rep.id === repId ? { ...rep, mark_unread: false } : rep,
        ),
      );
    }
  };

  const handleImportComplete = (importedCount) => {
    fetchData();
    // Show success message or toast
    console.log(`Successfully imported ${importedCount} representatives`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Client':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Contacted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Not Interested':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Declined':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Not a Fit':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Asked to Reach Out Later':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Pending Connection':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'No Reply':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canEdit =
    currentUser?.role === 'Admin' || currentUser?.role === 'Editor';
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
                <h1 className="text-3xl font-bold text-gray-900">
                  Representatives
                </h1>
                <p className="mt-2 text-gray-600">
                  Welcome back! Here's what's happening with your leads.
                </p>
              </div>
              <div className="flex space-x-3"></div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Companies
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalCompanies || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  +{stats.recentCompanies || 0} this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Representatives
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalRepresentatives || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  +{stats.recentContacts || 0} contacted this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Converted Clients
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.clientCount || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {statusStats.Client || 0} total clients
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Conversion Rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalCompanies > 0
                    ? (
                        (stats.clientCount / stats.totalCompanies) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground">
                  Overall conversion rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search representatives..."
                    value={filters.search}
                    onChange={(e) =>
                      handleFilterChange('search', e.target.value)
                    }
                    className="pl-10"
                  />
                </div>

                <Select
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
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

                <Select
                  value={filters.assigned_to}
                  onValueChange={(value) =>
                    handleFilterChange(
                      'assigned_to',
                      value === 'all_assignees' ? '' : value,
                    )
                  }
                >
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

                <Select
                  value={filters.unread_filter}
                  onValueChange={(value) =>
                    handleFilterChange('unread_filter', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by read status" />
                  </SelectTrigger>
                  <SelectContent>
                    {READ_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.rep_position}
                  onValueChange={(value) =>
                    handleFilterChange(
                      'rep_position',
                      value === 'all_positions' ? '' : value,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_positions">All Positions</SelectItem>
                    <SelectItem value="1">First Representative</SelectItem>
                    <SelectItem value="2">Second Representative</SelectItem>
                    <SelectItem value="3">Third Representative</SelectItem>
                    <SelectItem value="4">Fourth Representative</SelectItem>
                    <SelectItem value="5">Fifth Representative</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.exported_filter}
                  onValueChange={(value) =>
                    handleFilterChange(
                      'exported_filter',
                      value === 'all_exported_status' ? '' : value,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by export status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_exported_status">All</SelectItem>
                    <SelectItem value="exported_only">Exported Only</SelectItem>
                    <SelectItem value="not_exported_only">
                      Not Exported Only
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Company Multi-Select Dropdown */}
                <div className="space-y-2">
                  <div className="relative">
                    <Select>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Filter by Company">
                          {filters.company_ids.length === 0
                            ? 'Select companies...'
                            : `${filters.company_ids.length} companies selected`}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <div className="p-2 border-b">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              Select Companies
                            </span>
                            {filters.company_ids.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearCompanyFilter}
                                className="text-xs text-blue-600 hover:text-blue-800 h-6 px-2"
                              >
                                Clear All
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="p-2 border-b bg-gray-50">
                          <div
                            className="flex items-center space-x-2 py-1.5 hover:bg-gray-100 cursor-pointer rounded"
                            onClick={() =>
                              handleFilterChange(
                                'company_id',
                                filters.company_id === 'empty' ? '' : 'empty',
                              )
                            }
                          >
                            <Checkbox
                              checked={filters.company_id === 'empty'}
                              onCheckedChange={(checked) =>
                                handleFilterChange(
                                  'company_id',
                                  checked ? 'empty' : '',
                                )
                              }
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Label className="text-sm cursor-pointer font-medium text-gray-700">
                              No Company Assigned
                            </Label>
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {companies.map((company) => (
                            <div
                              key={company.id}
                              className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer"
                              onClick={() =>
                                handleCompanyFilterChange(
                                  company.id,
                                  !filters.company_ids.includes(company.id),
                                )
                              }
                            >
                              <Checkbox
                                checked={filters.company_ids.includes(
                                  company.id,
                                )}
                                onCheckedChange={(checked) =>
                                  handleCompanyFilterChange(company.id, checked)
                                }
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Label
                                className="text-sm cursor-pointer flex-1 truncate"
                                title={company.company_name}
                              >
                                {company.company_name}
                              </Label>
                            </div>
                          ))}
                        </div>
                        {filters.company_ids.length > 0 && (
                          <div className="p-2 border-t bg-gray-50">
                            <div className="text-xs text-gray-600">
                              {filters.company_ids.length} of {companies.length}{' '}
                              companies selected
                            </div>
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                      >
                        {filters.contacted_by.length === 0 ? (
                          'Contacted by'
                        ) : (
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            <span className="truncate">
                              {(() => {
                                const selectedUsers = users.filter((user) =>
                                  filters.contacted_by.includes(user.id),
                                );
                                const names = selectedUsers.map(
                                  (user) =>
                                    `${user.first_name} ${user.last_name}`,
                                );
                                if (names.length <= 2) {
                                  return names.join(', ');
                                } else {
                                  return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
                                }
                              })()}
                            </span>
                          </div>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64" align="start">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">Select Users</h4>
                          {filters.contacted_by.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearContactedByFilter}
                              className="text-xs"
                            >
                              Clear All
                            </Button>
                          )}
                        </div>
                        <div className="space-y-3 max-h-48 overflow-y-auto">
                          {users.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`contacted-by-${user.id}`}
                                checked={filters.contacted_by.includes(user.id)}
                                onCheckedChange={(checked) =>
                                  handleContactedByChange(user.id, checked)
                                }
                              />
                              <Label
                                htmlFor={`contacted-by-${user.id}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {user.first_name} {user.last_name}
                              </Label>
                            </div>
                          ))}
                        </div>
                        {filters.contacted_by.length > 0 && (
                          <div className="pt-3 border-t">
                            <div className="text-xs text-gray-500">
                              {filters.contacted_by.length} user
                              {filters.contacted_by.length !== 1
                                ? 's'
                                : ''}{' '}
                              selected
                            </div>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Sorting Controls */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Sort by:
                    </Label>
                    <Select
                      value={filters.sort_field}
                      onValueChange={(value) =>
                        handleFilterChange('sort_field', value)
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_name">Name</SelectItem>
                        <SelectItem value="company_name">Company</SelectItem>
                        <SelectItem value="created_at">Created At</SelectItem>
                        <SelectItem value="updated_at">Modified At</SelectItem>
                        <SelectItem value="reminder_date">Reminder</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Button
                      variant={
                        filters.sort_order === 'asc' ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => handleFilterChange('sort_order', 'asc')}
                      className="px-3"
                    >
                      ↑ ASC
                    </Button>
                    <Button
                      variant={
                        filters.sort_order === 'desc' ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => handleFilterChange('sort_order', 'desc')}
                      className="px-3"
                    >
                      ↓ DESC
                    </Button>
                  </div>
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
                          <h4 className="font-medium text-sm mb-3">
                            Show/Hide Columns
                          </h4>
                          <div className="space-y-3">
                            {TABLE_COLUMNS.map((column) => (
                              <div
                                key={column.key}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={column.key}
                                  checked={visibleColumns[column.key]}
                                  onCheckedChange={(checked) =>
                                    handleColumnToggle(column.key, checked)
                                  }
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
                            onClick={() =>
                              setVisibleColumns({
                                name: true,
                                company: true,
                                role: true,
                                contact_source: true,
                                linkedin_profile_url: true,
                                contact_date: true,
                                follow_up_dates: true,
                                status: true,
                                outcome: true,
                                reminder: true,
                                contacted_by: true,
                                assigned_to: true,
                                notes: true,
                                created_at: true,
                              })
                            }
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
                  <Button
                    variant="outline"
                    onClick={() => setImportModalOpen(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Representatives CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setExportModalOpen(true)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  {canEdit && (
                    <Button
                      onClick={handleAddRepresentative}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Representative
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selectedRepresentatives.length > 0 && (canDelete || canEdit) && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800">
                  {selectedRepresentatives.length} representatives selected
                </span>
                <div className="flex space-x-2">
                  {canEdit && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkMarkReadUnread(false)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <BookOpenCheck className="h-4 w-4 mr-2" />
                        Mark Read
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkMarkReadUnread(true)}
                        className="text-orange-600 hover:text-orange-800"
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        Mark Unread
                      </Button>
                    </>
                  )}
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkAssignToMe}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Assign Selected to Me
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Representatives Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Representatives</span>
                <span className="text-sm font-normal text-gray-500">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                  {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of{' '}
                  {totalCount}
                </span>
              </CardTitle>
              <CardDescription>
                Representative contacts and their status (Page {currentPage} of{' '}
                {totalPages})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : representatives.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No representatives found
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Get started by adding your first representative.
                  </p>
                  {canEdit && (
                    <Button onClick={handleAddRepresentative}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Representative
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
                              checked={
                                selectedRepresentatives.length ===
                                representatives.length
                              }
                              onCheckedChange={handleSelectAll}
                            />
                          </th>
                        )}
                        <th
                          className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky bg-gray-50 z-10 ${canDelete ? 'left-14' : 'left-0'}`}
                        >
                          Name
                        </th>
                        {visibleColumns.company && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group-hover:bg-gray-50">
                            Company
                          </th>
                        )}
                        {visibleColumns.role && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group-hover:bg-gray-50">
                            Role
                          </th>
                        )}
                        {visibleColumns.linkedin_profile_url && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                            LinkedIn
                          </th>
                        )}
                        {visibleColumns.method_of_contact && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                            Method of Contact
                          </th>
                        )}
                        {visibleColumns.contact_source && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 group-hover:bg-gray-50">
                            Contact Origin
                          </th>
                        )}
                        {visibleColumns.contact_date && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 group-hover:bg-gray-50">
                            Contact Date
                          </th>
                        )}
                        {visibleColumns.follow_up_dates && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                            Follow-up Dates
                          </th>
                        )}
                        {visibleColumns.status && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group-hover:bg-gray-50">
                            Status
                          </th>
                        )}
                        {visibleColumns.outcome && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 group-hover:bg-gray-50">
                            Outcome
                          </th>
                        )}
                        {visibleColumns.reminder && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reminder
                          </th>
                        )}
                        {visibleColumns.contacted_by && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 group-hover:bg-gray-50">
                            Contacted By
                          </th>
                        )}
                        {visibleColumns.assigned_to && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group-hover:bg-gray-50">
                            Assigned To
                          </th>
                        )}
                        {visibleColumns.notes && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                            Notes
                          </th>
                        )}
                        {visibleColumns.created_at && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                            Created At
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {representatives.map((rep) => (
                        <tr
                          key={rep.id}
                          className={`group hover:bg-gray-50 ${rep.mark_unread ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                        >
                          {canDelete && (
                            <td
                              className={`px-6 py-4 whitespace-nowrap sticky left-0 z-10 ${rep.mark_unread ? 'bg-blue-50 group-hover:bg-gray-50' : 'bg-white group-hover:bg-gray-50'}`}
                            >
                              <Checkbox
                                checked={selectedRepresentatives.includes(
                                  rep.id,
                                )}
                                onCheckedChange={(checked) =>
                                  handleSelectRepresentative(rep.id, checked)
                                }
                              />
                            </td>
                          )}
                          <td
                            className={`px-6 py-4 whitespace-nowrap sticky z-10 ${canDelete ? 'left-14' : 'left-0'} ${rep.mark_unread ? 'bg-blue-50 group-hover:bg-gray-50' : 'bg-white group-hover:bg-gray-50'}`}
                          >
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                                  <span className="text-sm font-medium text-white">
                                    {rep.first_name?.[0]}
                                    {rep.last_name?.[0]}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4 flex-1 flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() =>
                                            handleRepresentativeClick(rep.id)
                                          }
                                          className="text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left"
                                        >
                                          {rep.first_name} {rep.last_name}
                                        </button>
                                        {rep.linkedin_profile_url && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const url =
                                                rep.linkedin_profile_url.startsWith(
                                                  'http',
                                                )
                                                  ? rep.linkedin_profile_url
                                                  : `https://${rep.linkedin_profile_url}`;
                                              window.open(
                                                url,
                                                '_blank',
                                                'noopener,noreferrer',
                                              );
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
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {rep.contact_date
                                      ? new Date(
                                          rep.contact_date,
                                        ).toLocaleDateString()
                                      : 'Not contacted'}
                                  </div>
                                </div>
                                <div className="flex items-center justify-center space-x-3">
                                  {canEdit && (
                                    <button
                                      onClick={() =>
                                        handleEditRepresentative(rep)
                                      }
                                      className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
                                      title="Edit Representative"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      onClick={() =>
                                        handleDeleteRepresentative(rep)
                                      }
                                      className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
                                      title="Delete Representative"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          {visibleColumns.company && (
                            <td className="px-6 py-4 whitespace-nowrap group-hover:bg-gray-50">
                              <div className="text-sm text-gray-900">
                                {rep.company?.company_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {rep.company?.status}
                              </div>
                            </td>
                          )}
                          {visibleColumns.role && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 group-hover:bg-gray-50">
                              {rep.role || 'N/A'}
                            </td>
                          )}
                          {visibleColumns.linkedin_profile_url && (
                            <td className="px-4 py-4 text-sm truncate max-w-32 group-hover:bg-gray-50">
                              {rep.linkedin_profile_url ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const url =
                                      rep.linkedin_profile_url.startsWith(
                                        'http',
                                      )
                                        ? rep.linkedin_profile_url
                                        : `https://${rep.linkedin_profile_url}`;
                                    window.open(
                                      url,
                                      '_blank',
                                      'noopener,noreferrer',
                                    );
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
                          {visibleColumns.method_of_contact && (
                            <td className="px-4 py-4 text-sm text-gray-900 truncate max-w-32 group-hover:bg-gray-50">
                              {rep.method_of_contact || 'N/A'}
                            </td>
                          )}
                          {visibleColumns.contact_source && (
                            <td className="px-4 py-4 text-sm text-gray-900 truncate max-w-32 group-hover:bg-gray-50">
                              {rep.contact_source || 'N/A'}
                            </td>
                          )}
                          {visibleColumns.contact_date && (
                            <td className="px-4 py-4 text-sm text-gray-900 truncate max-w-32 group-hover:bg-gray-50">
                              {rep.contact_date
                                ? new Date(
                                    rep.contact_date,
                                  ).toLocaleDateString()
                                : 'N/A'}
                            </td>
                          )}
                          {visibleColumns.follow_up_dates && (
                            <td className="px-4 py-4 text-sm text-gray-900 truncate max-w-32">
                              {rep.follow_up_dates &&
                              rep.follow_up_dates.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {rep.follow_up_dates
                                    .slice(0, 2)
                                    .map((date, index) => (
                                      <span
                                        key={index}
                                        className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded"
                                      >
                                        {new Date(date).toLocaleDateString()}
                                      </span>
                                    ))}
                                  {rep.follow_up_dates.length > 2 && (
                                    <span className="text-xs text-gray-500">
                                      +{rep.follow_up_dates.length - 2}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                'N/A'
                              )}
                            </td>
                          )}
                          {visibleColumns.status && (
                            <td className="px-6 py-4 whitespace-nowrap group-hover:bg-gray-50">
                              {canEdit ? (
                                <Select
                                  value={rep.status || 'No Status'}
                                  onValueChange={(value) =>
                                    handleStatusChange(rep.id, value)
                                  }
                                >
                                  <SelectTrigger className="w-full min-w-[140px] h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {INLINE_STATUS_OPTIONS.map((option) => (
                                      <SelectItem
                                        key={option.value}
                                        value={option.value}
                                        className="text-xs"
                                      >
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : rep.status ? (
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(rep.status)}`}
                                >
                                  {rep.status}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">
                                  No status
                                </span>
                              )}
                            </td>
                          )}
                          {visibleColumns.outcome && (
                            <td className="px-4 py-4 text-sm text-gray-900 truncate max-w-32 group-hover:bg-gray-50">
                              {rep.outcome || 'N/A'}
                            </td>
                          )}
                          {visibleColumns.reminder && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              {rep.reminder_date ? (
                                <div className="flex items-center">
                                  <div
                                    className={`w-3 h-3 rounded-full mr-2 ${
                                      new Date(rep.reminder_date) <= new Date()
                                        ? 'bg-red-500'
                                        : 'bg-orange-500'
                                    }`}
                                  ></div>
                                  <span
                                    className={`text-sm ${
                                      new Date(rep.reminder_date) <= new Date()
                                        ? 'text-red-600 font-medium'
                                        : 'text-orange-600'
                                    }`}
                                  >
                                    {formatDate(rep.reminder_date)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">
                                  No reminder
                                </span>
                              )}
                            </td>
                          )}
                          {visibleColumns.contacted_by && (
                            <td className="px-4 py-4 text-sm text-gray-900 truncate max-w-32 group-hover:bg-gray-50">
                              {rep.contacted_user
                                ? `${rep.contacted_user.first_name} ${rep.contacted_user.last_name}`
                                : 'N/A'}
                            </td>
                          )}
                          {visibleColumns.assigned_to && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 group-hover:bg-gray-50">
                              {rep.assigned_user ? (
                                `${rep.assigned_user.first_name} ${rep.assigned_user.last_name}`
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAssignToMe(rep.id)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  Assign to me
                                </Button>
                              )}
                            </td>
                          )}
                          {visibleColumns.notes && (
                            <td
                              className="px-4 py-4 text-sm text-gray-900 truncate max-w-32"
                              title={rep.notes}
                            >
                              {rep.notes
                                ? rep.notes.length > 50
                                  ? `${rep.notes.substring(0, 50)}...`
                                  : rep.notes
                                : 'N/A'}
                            </td>
                          )}
                          {visibleColumns.created_at && (
                            <td className="px-4 py-4 text-sm text-gray-900 truncate max-w-32 group-hover:bg-gray-50">
                              {new Date(rep.created_at).toLocaleDateString()}
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

          {/* Pagination Controls at Bottom */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of{' '}
                {totalCount} representatives
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-3 py-2 text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Representative Dialog */}
          <RepresentativeDialog
            isOpen={dialogOpen}
            onClose={() => setDialogOpen(false)}
            onSave={handleSaveRepresentative}
            representative={editingRep}
            saving={saving}
          />

          {/* Representative Detail Modal */}
          <RepresentativeDetailModal
            isOpen={repDetailModalOpen}
            onClose={() => setRepDetailModalOpen(false)}
            representativeId={selectedRepId}
          />

          {/* CSV Import Modal */}
          <CSVImportModal
            isOpen={importModalOpen}
            onClose={() => setImportModalOpen(false)}
            onImportComplete={handleImportComplete}
            importType="representatives"
          />

          {/* CSV Export Modal */}
          <CSVExportModal
            isOpen={exportModalOpen}
            onClose={() => setExportModalOpen(false)}
            data={representatives}
            exportType="representatives"
            selectedItems={selectedRepresentatives}
            filters={filters}
          />
        </main>
      </div>
    </ProtectedRoute>
  );
}