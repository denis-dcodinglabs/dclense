'use client';

import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Users, BarChart3, ArrowUpDown } from 'lucide-react';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getContactMethodStats, getAgentStats } from '@/lib/statistics';

export default function StatisticsPage() {
  const [contactMethodData, setContactMethodData] = useState([]);
  const [agentData, setAgentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [contactMethodSort, setContactMethodSort] = useState({ field: 'method', order: 'asc' });
  const [agentSort, setAgentSort] = useState({ field: 'agent_name', order: 'asc' });

  useEffect(() => {
    fetchStatistics();
  }, [dateRange, selectedAgent]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const [contactMethodResult, agentResult] = await Promise.all([
        getContactMethodStats(dateRange),
        getAgentStats(dateRange, selectedAgent)
      ]);

      if (!contactMethodResult.error) {
        setContactMethodData(contactMethodResult.data || []);
      }
      if (!agentResult.error) {
        setAgentData(agentResult.data || []);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContactMethodSort = (field) => {
    const newOrder = contactMethodSort.field === field && contactMethodSort.order === 'asc' ? 'desc' : 'asc';
    setContactMethodSort({ field, order: newOrder });
    
    const sorted = [...contactMethodData].sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (newOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    setContactMethodData(sorted);
  };

  const handleAgentSort = (field) => {
    const newOrder = agentSort.field === field && agentSort.order === 'asc' ? 'desc' : 'asc';
    setAgentSort({ field, order: newOrder });
    
    const sorted = [...agentData].sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (newOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    setAgentData(sorted);
  };

  const getSortIcon = (field, currentSort) => {
    if (currentSort.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return currentSort.order === 'asc' ? 
      <ArrowUpDown className="h-4 w-4 text-blue-600 rotate-180" /> : 
      <ArrowUpDown className="h-4 w-4 text-blue-600" />;
  };

  const formatPercentage = (value) => {
    return `${parseFloat(value || 0).toFixed(1)}%`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Get unique agents for filter
  const uniqueAgents = [...new Set(agentData.map(agent => agent.agent_name))];

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <BarChart3 className="h-8 w-8 mr-3" />
                  Statistics & Insights
                </h1>
                <p className="mt-2 text-gray-600">
                  Analyze contact method performance and agent statistics
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                      <SelectItem value="365">Last year</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Method Performance Table */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Contact Method Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : contactMethodData.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No contact method data available for the selected period.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <Button
                            variant="ghost"
                            onClick={() => handleContactMethodSort('method')}
                            className="text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 p-0 h-auto"
                          >
                            Method of Contact
                            {getSortIcon('method', contactMethodSort)}
                          </Button>
                        </th>
                        <th className="px-6 py-3 text-left">
                          <Button
                            variant="ghost"
                            onClick={() => handleContactMethodSort('leads_contacted')}
                            className="text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 p-0 h-auto"
                          >
                            Leads Contacted
                            {getSortIcon('leads_contacted', contactMethodSort)}
                          </Button>
                        </th>
                        <th className="px-6 py-3 text-left">
                          <Button
                            variant="ghost"
                            onClick={() => handleContactMethodSort('responses')}
                            className="text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 p-0 h-auto"
                          >
                            Responses
                            {getSortIcon('responses', contactMethodSort)}
                          </Button>
                        </th>
                        <th className="px-6 py-3 text-left">
                          <Button
                            variant="ghost"
                            onClick={() => handleContactMethodSort('response_rate')}
                            className="text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 p-0 h-auto"
                          >
                            Response Rate (%)
                            {getSortIcon('response_rate', contactMethodSort)}
                          </Button>
                        </th>
                        <th className="px-6 py-3 text-left">
                          <Button
                            variant="ghost"
                            onClick={() => handleContactMethodSort('conversions')}
                            className="text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 p-0 h-auto"
                          >
                            Conversions
                            {getSortIcon('conversions', contactMethodSort)}
                          </Button>
                        </th>
                        <th className="px-6 py-3 text-left">
                          <Button
                            variant="ghost"
                            onClick={() => handleContactMethodSort('conversion_rate')}
                            className="text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 p-0 h-auto"
                          >
                            Conversion Rate (%)
                            {getSortIcon('conversion_rate', contactMethodSort)}
                          </Button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {contactMethodData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="text-sm font-medium text-gray-900">
                                {row.method || 'Unknown'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.leads_contacted || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.responses || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPercentage(row.response_rate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.conversions || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPercentage(row.conversion_rate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agent Stats Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Agent Statistics
                </CardTitle>
                <div className="flex items-center space-x-4">
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agents</SelectItem>
                      {uniqueAgents.map((agent) => (
                        <SelectItem key={agent} value={agent}>
                          {agent}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : agentData.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No agent data available for the selected period.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <Button
                            variant="ghost"
                            onClick={() => handleAgentSort('agent_name')}
                            className="text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 p-0 h-auto"
                          >
                            Agent Name
                            {getSortIcon('agent_name', agentSort)}
                          </Button>
                        </th>
                        <th className="px-6 py-3 text-left">
                          <Button
                            variant="ghost"
                            onClick={() => handleAgentSort('leads_contacted')}
                            className="text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 p-0 h-auto"
                          >
                            Leads Contacted
                            {getSortIcon('leads_contacted', agentSort)}
                          </Button>
                        </th>
                        <th className="px-6 py-3 text-left">
                          <Button
                            variant="ghost"
                            onClick={() => handleAgentSort('responses')}
                            className="text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 p-0 h-auto"
                          >
                            Responses
                            {getSortIcon('responses', agentSort)}
                          </Button>
                        </th>
                        <th className="px-6 py-3 text-left">
                          <Button
                            variant="ghost"
                            onClick={() => handleAgentSort('response_rate')}
                            className="text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 p-0 h-auto"
                          >
                            Response Rate (%)
                            {getSortIcon('response_rate', agentSort)}
                          </Button>
                        </th>
                        <th className="px-6 py-3 text-left">
                          <Button
                            variant="ghost"
                            onClick={() => handleAgentSort('conversions')}
                            className="text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 p-0 h-auto"
                          >
                            Conversions
                            {getSortIcon('conversions', agentSort)}
                          </Button>
                        </th>
                        <th className="px-6 py-3 text-left">
                          <Button
                            variant="ghost"
                            onClick={() => handleAgentSort('conversion_rate')}
                            className="text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 p-0 h-auto"
                          >
                            Conversion Rate (%)
                            {getSortIcon('conversion_rate', agentSort)}
                          </Button>
                        </th>
                        <th className="px-6 py-3 text-left">
                          <Button
                            variant="ghost"
                            onClick={() => handleAgentSort('last_activity')}
                            className="text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 p-0 h-auto"
                          >
                            Last Activity
                            {getSortIcon('last_activity', agentSort)}
                          </Button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {agentData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                                  <span className="text-xs font-medium text-white">
                                    {row.agent_name?.split(' ').map(n => n[0]).join('') || 'U'}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {row.agent_name || 'Unknown Agent'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.leads_contacted || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.responses || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPercentage(row.response_rate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.conversions || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPercentage(row.conversion_rate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(row.last_activity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </AdminProtectedRoute>
  );
}