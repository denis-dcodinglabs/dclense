'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Eye, Calendar, User, Database, Activity } from 'lucide-react';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAuditLogs } from '@/lib/logs';
import { getUsers } from '@/lib/users';

const ACTION_COLORS = {
  create: 'bg-green-100 text-green-800 border-green-200',
  update: 'bg-blue-100 text-blue-800 border-blue-200',
  delete: 'bg-red-100 text-red-800 border-red-200',
  bulk_delete: 'bg-red-100 text-red-800 border-red-200',
  csv_import: 'bg-purple-100 text-purple-800 border-purple-200',
  csv_export: 'bg-orange-100 text-orange-800 border-orange-200'
};

const TABLE_ICONS = {
  companies: '🏢',
  representatives: '👤',
  users_role: '👥'
};

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const ITEMS_PER_PAGE = 50;

  const [filters, setFilters] = useState({
    user_id: '',
    action: '',
    table_name: '',
    date_from: '',
    date_to: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchLogs();
  }, [currentPage, filters]);

  const fetchUsers = async () => {
    const { data } = await getUsers();
    setUsers(data || []);
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, count } = await getAuditLogs(currentPage, ITEMS_PER_PAGE, filters);
      setLogs(data || []);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value === 'all' ? '' : value }));
    setCurrentPage(1);
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setDetailModalOpen(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatJsonData = (data) => {
    if (!data) return 'N/A';
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return 'Invalid JSON';
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'create': return '➕';
      case 'update': return '✏️';
      case 'delete': return '🗑️';
      case 'bulk_delete': return '🗑️';
      case 'csv_import': return '📥';
      case 'csv_export': return '📤';
      default: return '📝';
    }
  };

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
                <p className="mt-2 text-gray-600">
                  Monitor user activity and system changes
                </p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Activity className="h-4 w-4" />
                <span>Real-time activity tracking</span>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCount}</div>
                <p className="text-xs text-muted-foreground">
                  All recorded activities
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(logs.map(log => log.user_id)).size}
                </div>
                <p className="text-xs text-muted-foreground">
                  Users with recent activity
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Actions</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {logs.filter(log => {
                    const logDate = new Date(log.created_at).toDateString();
                    const today = new Date().toDateString();
                    return logDate === today;
                  }).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Actions performed today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Most Active Table</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {logs.length > 0 ? 
                    Object.entries(logs.reduce((acc, log) => {
                      acc[log.table_name] = (acc[log.table_name] || 0) + 1;
                      return acc;
                    }, {})).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'
                    : 'N/A'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  Most modified table
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Select value={filters.user_id} onValueChange={(value) => handleFilterChange('user_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.action} onValueChange={(value) => handleFilterChange('action', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="bulk_delete">Bulk Delete</SelectItem>
                    <SelectItem value="csv_import">CSV Import</SelectItem>
                    <SelectItem value="csv_export">CSV Export</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.table_name} onValueChange={(value) => handleFilterChange('table_name', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by table" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tables</SelectItem>
                    <SelectItem value="companies">Companies</SelectItem>
                    <SelectItem value="representatives">Representatives</SelectItem>
                    <SelectItem value="users_role">Users</SelectItem>
                  </SelectContent>
                </Select>

                <div>
                  <Input
                    type="date"
                    placeholder="From date"
                    value={filters.date_from}
                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  />
                </div>

                <div>
                  <Input
                    type="date"
                    placeholder="To date"
                    value={filters.date_to}
                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Activity Logs</span>
                <span className="text-sm font-normal text-gray-500">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
                  <p className="text-gray-500">No activity logs match your current filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Table
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Record ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date & Time
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                                  <span className="text-xs font-medium text-white">
                                    {log.user?.first_name?.[0]}{log.user?.last_name?.[0]}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {log.user ? `${log.user.first_name} ${log.user.last_name}` : 'Unknown User'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {log.user?.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="mr-2">{getActionIcon(log.action)}</span>
                              <Badge className={`${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800 border-gray-200'} border`}>
                                {log.action}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="mr-2">{TABLE_ICONS[log.table_name] || '📄'}</span>
                              <span className="text-sm text-gray-900">{log.table_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900 font-mono">
                              {log.record_id ? log.record_id.substring(0, 8) + '...' : 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(log.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(log)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
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
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} logs
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-3 py-2 text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
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

          {/* Detail Modal */}
          {detailModalOpen && selectedLog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Log Details</h2>
                  <Button variant="ghost" onClick={() => setDetailModalOpen(false)}>
                    ✕
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">User</label>
                      <div className="mt-1 text-gray-900">
                        {selectedLog.user ? `${selectedLog.user.first_name} ${selectedLog.user.last_name}` : 'Unknown User'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Action</label>
                      <div className="mt-1">
                        <Badge className={`${ACTION_COLORS[selectedLog.action] || 'bg-gray-100 text-gray-800 border-gray-200'} border`}>
                          {selectedLog.action}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Table</label>
                      <div className="mt-1 text-gray-900">{selectedLog.table_name}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Record ID</label>
                      <div className="mt-1 text-gray-900 font-mono text-sm">{selectedLog.record_id || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Date & Time</label>
                      <div className="mt-1 text-gray-900">{formatDate(selectedLog.created_at)}</div>
                    </div>
                  </div>

                  {selectedLog.old_values && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Old Values</label>
                      <pre className="mt-1 bg-red-50 p-3 rounded text-xs overflow-x-auto">
                        {formatJsonData(selectedLog.old_values)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.new_values && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">New Values</label>
                      <pre className="mt-1 bg-green-50 p-3 rounded text-xs overflow-x-auto">
                        {formatJsonData(selectedLog.new_values)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.metadata && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Metadata</label>
                      <pre className="mt-1 bg-blue-50 p-3 rounded text-xs overflow-x-auto">
                        {formatJsonData(selectedLog.metadata)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </AdminProtectedRoute>
  );
}