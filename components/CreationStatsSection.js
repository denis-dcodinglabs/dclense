'use client';

import { useState } from 'react';
import { CalendarDays, BarChart3, Users, Building2, Phone, ChevronDown, Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { getCreationStats, getContactedStats, getStatusCounts } from '@/lib/statistics';

// Status options for representatives
const REPRESENTATIVE_STATUS_OPTIONS = [
  { value: 'No Status', label: 'No Status' },
  { value: 'No Reply', label: 'No Reply' },
  { value: 'Not Interested', label: 'Not Interested' },
  { value: 'Contacted', label: 'Contacted' },
  { value: 'Connected', label: 'Connected' },
  { value: 'In Communication', label: 'In Communication' },
  { value: 'Not a Fit', label: 'Not a Fit' },
  { value: 'Asked to Reach Out Later', label: 'Asked to Reach Out Later' },
  { value: 'Declined', label: 'Declined' },
  { value: 'Client', label: 'Client' },
  { value: 'Pending Connection', label: 'Pending Connection' },
];

// Status options for companies
const COMPANY_STATUS_OPTIONS = [
  { value: 'No Status', label: 'No Status' },
  { value: 'Declined', label: 'Declined' },
  { value: 'Company Not a Fit', label: 'Company Not a Fit' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Client', label: 'Client' },
  { value: 'Revisit Later', label: 'Revisit Later' },
  { value: 'No Reply', label: 'No Reply' }
];

export default function CreationStatsSection() {
  const [creationStats, setCreationStats] = useState(null);
  const [contactedStats, setContactedStats] = useState(null);
  const [statusCountsData, setStatusCountsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState([]);

  const fetchAllStats = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      return;
    }

    const startDate = dateRange.from.toISOString().split('T')[0];
    const endDate = dateRange.to.toISOString().split('T')[0];

    setStatsLoading(true);
    try {
      const promises = [
        getCreationStats(startDate, endDate),
        getContactedStats(startDate, endDate)
      ];

      // Add status counts query if category and statuses are selected
      if (selectedCategory && selectedStatuses.length > 0) {
        promises.push(getStatusCounts(startDate, endDate, selectedCategory, selectedStatuses));
      }

      const results = await Promise.all(promises);
      const [creationResult, contactedResult, statusCountsResult] = results;

      if (!creationResult.error) {
        setCreationStats(creationResult.data);
      } else {
        console.error('Error fetching creation stats:', creationResult.error);
        setCreationStats(null);
      }

      if (!contactedResult.error) {
        setContactedStats(contactedResult.data);
      } else {
        console.error('Error fetching contacted stats:', contactedResult.error);
        setContactedStats(null);
      }

      // Handle status counts result if it exists
      if (statusCountsResult) {
        if (!statusCountsResult.error) {
          setStatusCountsData(statusCountsResult.data);
        } else {
          console.error('Error fetching status counts:', statusCountsResult.error);
          setStatusCountsData(null);
        }
      } else {
        setStatusCountsData(null);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setCreationStats(null);
      setContactedStats(null);
      setStatusCountsData(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleFetchStats = () => {
    fetchAllStats();
  };

  const resetStats = () => {
    setCreationStats(null);
    setContactedStats(null);
    setStatusCountsData(null);
    setDateRange({ from: undefined, to: undefined });
    setSelectedCategory('');
    setSelectedStatuses([]);
  };

  // Handle category change and reset status
  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    setSelectedStatuses([]); // Reset status when category changes
  };

  // Handle status selection/deselection
  const handleStatusToggle = (statusValue) => {
    setSelectedStatuses(prev => {
      if (prev.includes(statusValue)) {
        return prev.filter(status => status !== statusValue);
      } else {
        return [...prev, statusValue];
      }
    });
  };

  // Handle select all / deselect all
  const handleSelectAll = () => {
    const allStatuses = getStatusOptions().map(option => option.value);
    const allSelected = allStatuses.every(status => selectedStatuses.includes(status));
    
    if (allSelected) {
      // Deselect all
      setSelectedStatuses([]);
    } else {
      // Select all
      setSelectedStatuses(allStatuses);
    }
  };

  // Check if all statuses are selected
  const areAllStatusesSelected = () => {
    const allStatuses = getStatusOptions().map(option => option.value);
    return allStatuses.length > 0 && allStatuses.every(status => selectedStatuses.includes(status));
  };


  // Get display text for selected statuses
  const getSelectedStatusesDisplay = () => {
    if (selectedStatuses.length === 0) {
      return selectedCategory ? "Select statuses" : "Select category first";
    } else if (areAllStatusesSelected()) {
      return "All statuses selected";
    } else if (selectedStatuses.length === 1) {
      const option = getStatusOptions().find(opt => opt.value === selectedStatuses[0]);
      return option ? option.label : selectedStatuses[0];
    } else {
      return `${selectedStatuses.length} statuses selected`;
    }
  };

  // Get status options based on selected category
  const getStatusOptions = () => {
    if (selectedCategory === 'Representatives') {
      return REPRESENTATIVE_STATUS_OPTIONS;
    } else if (selectedCategory === 'Companies') {
      return COMPANY_STATUS_OPTIONS;
    }
    return [];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Format date range display
  const formatDateRange = () => {
    if (!dateRange?.from) {
      return "Pick a date range";
    }
    if (dateRange.from && !dateRange.to) {
      return `From ${formatDate(dateRange.from.toISOString())}`;
    }
    if (dateRange.from && dateRange.to) {
      return `From ${formatDate(dateRange.from.toISOString())} To ${formatDate(dateRange.to.toISOString())}`;
    }
    return "Pick a date range";
  };

  // Clear date range
  const clearDateRange = (e) => {
    e.stopPropagation(); // Prevent popover from opening
    setDateRange({ from: undefined, to: undefined });
  };

  // Set preset date ranges
  const setPresetDateRange = (preset) => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    switch (preset) {
      case 'today':
        setDateRange({ 
          from: startOfToday, 
          to: startOfToday 
        });
        break;
      case 'lastWeek':
        const weekAgo = new Date(startOfToday);
        weekAgo.setDate(weekAgo.getDate() - 7);
        setDateRange({ 
          from: weekAgo, 
          to: startOfToday 
        });
        break;
      case 'last30Days':
        const thirtyDaysAgo = new Date(startOfToday);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        setDateRange({ 
          from: thirtyDaysAgo, 
          to: startOfToday 
        });
        break;
      case 'last90Days':
        const ninetyDaysAgo = new Date(startOfToday);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        setDateRange({ 
          from: ninetyDaysAgo, 
          to: startOfToday 
        });
        break;
      case 'lastYear':
        const oneYearAgo = new Date(startOfToday);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        setDateRange({ 
          from: oneYearAgo, 
          to: startOfToday 
        });
        break;
      default:
        break;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CalendarDays className="h-5 w-5 mr-2" />
          Contact Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Date Range, Category and Status Selectors */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-sm font-medium">
                Date Range
              </Label>
              <div className="relative">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full mt-1 justify-start text-left font-normal pr-10"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formatDateRange()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
                {(dateRange?.from || dateRange?.to) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                    onClick={clearDateRange}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              {/* Date Range Presets */}
              <div className="mt-2">
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-6 px-2 py-0"
                    onClick={() => setPresetDateRange('today')}
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-6 px-2 py-0"
                    onClick={() => setPresetDateRange('lastWeek')}
                  >
                    Last Week
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-6 px-2 py-0"
                    onClick={() => setPresetDateRange('last30Days')}
                  >
                    Last 30 Days
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-6 px-2 py-0"
                    onClick={() => setPresetDateRange('last90Days')}
                  >
                    Last 90 Days
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-6 px-2 py-0"
                    onClick={() => setPresetDateRange('lastYear')}
                  >
                    Last Year
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <Label htmlFor="category" className="text-sm font-medium">
                Category
              </Label>
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Representatives">Representatives</SelectItem>
                  <SelectItem value="Companies">Companies</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="status" className="text-sm font-medium">
                Status
              </Label>
              <div className="mt-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between text-left font-normal"
                      disabled={!selectedCategory}
                    >
                      <span className="truncate">{getSelectedStatusesDisplay()}</span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <div className="max-h-60 overflow-auto">
                      <div className="p-2">
                        {/* Select All Option */}
                        <div
                          className="flex items-center space-x-2 rounded-md p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 mb-1"
                          onClick={handleSelectAll}
                        >
                          <Checkbox
                            checked={areAllStatusesSelected()}
                            onChange={() => {}} // Handled by onClick above
                          />
                          <label className="text-sm font-medium cursor-pointer flex-1 text-blue-600">
                            Select All
                          </label>
                        </div>
                        
                        {/* Individual Status Options */}
                        {getStatusOptions().map((option) => (
                          <div
                            key={option.value}
                            className="flex items-center space-x-2 rounded-md p-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleStatusToggle(option.value)}
                          >
                            <Checkbox
                              checked={selectedStatuses.includes(option.value)}
                              onChange={() => {}} // Handled by onClick above
                            />
                            <label className="text-sm font-medium cursor-pointer flex-1">
                              {option.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Search and Reset Buttons */}
          <div className="flex justify-end gap-4 pt-4">
            <Button
              onClick={handleFetchStats}
              disabled={!dateRange?.from || !dateRange?.to || statsLoading}
              className="flex items-center space-x-2 min-w-[120px]"
            >
              {statsLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
              <span>Search</span>
            </Button>
            {(creationStats || contactedStats || statusCountsData) && (
              <Button
                variant="outline"
                onClick={resetStats}
                className="flex items-center space-x-2 min-w-[120px]"
              >
                <span>Reset</span>
              </Button>
            )}
          </div>

          {/* Results Display */}
          {(creationStats || contactedStats || statusCountsData) && (
            <div className="mt-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Results from {formatDate(creationStats?.start_date || contactedStats?.start_date || statusCountsData?.start_date)} to {formatDate(creationStats?.end_date || contactedStats?.end_date || statusCountsData?.end_date)}
                </h3>
              </div>
              
              {/* Creation Statistics */}
              {creationStats && (
                <div className="mb-8">
                  <h4 className="text-md font-medium text-gray-800 mb-4 flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Added During Period
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Representatives Added Card */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-700">Representatives Added</p>
                          <p className="text-3xl font-bold text-blue-900 mt-2">
                            {creationStats.representatives_count.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <Users className="h-8 w-8 text-blue-500" />
                        </div>
                      </div>
                    </div>

                    {/* Companies Added Card */}
                    <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-700">Companies Added</p>
                          <p className="text-3xl font-bold text-green-900 mt-2">
                            {creationStats.companies_count.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <Building2 className="h-8 w-8 text-green-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Contacted Statistics */}
              {contactedStats && (
                <div className="mb-8">
                  <h4 className="text-md font-medium text-gray-800 mb-4 flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    Contacted or Follow-up During Period
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Representatives Contacted Card */}
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-700">Representatives Contacted</p>
                          <p className="text-xs text-purple-600 mt-1">Includes contact & follow-up dates</p>
                          <p className="text-3xl font-bold text-purple-900 mt-2">
                            {contactedStats.representatives_contacted.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <Users className="h-8 w-8 text-purple-500" />
                        </div>
                      </div>
                    </div>

                    {/* Companies Contacted Card */}
                    <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-orange-700">Companies Contacted</p>
                          <p className="text-xs text-orange-600 mt-1">Includes contact & follow-up dates</p>
                          <p className="text-3xl font-bold text-orange-900 mt-2">
                            {contactedStats.companies_contacted.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <Building2 className="h-8 w-8 text-orange-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Counts Table */}
              {statusCountsData && (
                <div className="mb-8">
                  <h4 className="text-md font-medium text-gray-800 mb-4 flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {statusCountsData.category} by Status ({statusCountsData.totalRecords} total)
                  </h4>
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Count
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Percentage
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {statusCountsData.statusCounts.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.status}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 font-semibold">
                                  {item.count.toLocaleString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="text-sm text-gray-900">
                                    {item.percentage}%
                                  </div>
                                  <div className="ml-3 w-16 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full"
                                      style={{ width: `${Math.min(parseFloat(item.percentage), 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!creationStats && !contactedStats && !statusCountsData && !statsLoading && (
            <div className="text-center py-12">
              <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select Date Range</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Choose a start and end date to see how many representatives and companies were created, contacted, or have follow-up dates during that period.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
