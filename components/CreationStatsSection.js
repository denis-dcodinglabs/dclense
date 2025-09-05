'use client';

import { useState } from 'react';
import { CalendarDays, BarChart3, Users, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCreationStats } from '@/lib/statistics';

export default function CreationStatsSection() {
  const [creationStats, setCreationStats] = useState(null);
  const [creationStatsLoading, setCreationStatsLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchCreationStats = async () => {
    if (!startDate || !endDate) {
      return;
    }

    setCreationStatsLoading(true);
    try {
      const result = await getCreationStats(startDate, endDate);
      if (!result.error) {
        setCreationStats(result.data);
      } else {
        console.error('Error fetching creation stats:', result.error);
        setCreationStats(null);
      }
    } catch (error) {
      console.error('Error fetching creation stats:', error);
      setCreationStats(null);
    } finally {
      setCreationStatsLoading(false);
    }
  };

  const handleFetchCreationStats = () => {
    fetchCreationStats();
  };

  const resetCreationStats = () => {
    setCreationStats(null);
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
          Creation Statistics
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
                onClick={handleFetchCreationStats}
                disabled={!startDate || !endDate || creationStatsLoading}
                className="flex items-center space-x-2"
              >
                {creationStatsLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <BarChart3 className="h-4 w-4" />
                )}
                <span>Generate Report</span>
              </Button>
              {creationStats && (
                <Button
                  variant="outline"
                  onClick={resetCreationStats}
                  className="flex items-center space-x-2"
                >
                  <span>Reset</span>
                </Button>
              )}
            </div>
          </div>

          {/* Results Display */}
          {creationStats && (
            <div className="mt-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Results from {formatDate(creationStats.start_date)} to {formatDate(creationStats.end_date)}
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Representatives Card */}
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

                {/* Companies Card */}
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

          {/* Empty State */}
          {!creationStats && !creationStatsLoading && (
            <div className="text-center py-12">
              <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select Date Range</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Choose a start and end date to see how many representatives and companies were created during that period.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
