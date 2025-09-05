'use client';

import { useState } from 'react';
import { CalendarDays, BarChart3, Users, Building2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCreationStats, getContactedStats } from '@/lib/statistics';

export default function CreationStatsSection() {
  const [creationStats, setCreationStats] = useState(null);
  const [contactedStats, setContactedStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchAllStats = async () => {
    if (!startDate || !endDate) {
      return;
    }

    setStatsLoading(true);
    try {
      const [creationResult, contactedResult] = await Promise.all([
        getCreationStats(startDate, endDate),
        getContactedStats(startDate, endDate)
      ]);

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
    } catch (error) {
      console.error('Error fetching stats:', error);
      setCreationStats(null);
      setContactedStats(null);
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
    setStartDate('');
    setEndDate('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CalendarDays className="h-5 w-5 mr-2" />
          Creation & Contact Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Date Range Selector */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="start-date" className="text-sm font-medium">
                Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="end-date" className="text-sm font-medium">
                End Date
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={handleFetchStats}
                disabled={!startDate || !endDate || statsLoading}
                className="flex items-center space-x-2"
              >
                {statsLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <BarChart3 className="h-4 w-4" />
                )}
                <span>Search</span>
              </Button>
              {(creationStats || contactedStats) && (
                <Button
                  variant="outline"
                  onClick={resetStats}
                  className="flex items-center space-x-2"
                >
                  <span>Reset</span>
                </Button>
              )}
            </div>
          </div>

          {/* Results Display */}
          {(creationStats || contactedStats) && (
            <div className="mt-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Results from {formatDate(creationStats?.start_date || contactedStats?.start_date)} to {formatDate(creationStats?.end_date || contactedStats?.end_date)}
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
            </div>
          )}

          {/* Empty State */}
          {!creationStats && !contactedStats && !statsLoading && (
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
