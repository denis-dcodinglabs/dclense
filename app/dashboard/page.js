'use client';

import { useState, useEffect } from 'react';
import { Users, Building2, UserCheck, TrendingUp } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCompanies } from '@/lib/companies';
import { getUsers } from '@/lib/users';
import { getCurrentUserWithRole } from '@/lib/auth';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalUsers: 0,
    totalRepresentatives: 0,
    activeClients: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const user = await getCurrentUserWithRole();
    setCurrentUser(user);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch companies
      const { data: companies, count: companiesCount } = await getCompanies(1, 1000, {});
      
      // Fetch users
      const { data: users } = await getUsers();
      
      // Calculate stats
      const totalRepresentatives = companies?.reduce((sum, company) => 
        sum + (company.representatives?.length || 0), 0) || 0;
      
      const activeClients = companies?.filter(company => 
        company.status === 'Client').length || 0;

      setStats({
        totalCompanies: companiesCount || 0,
        totalUsers: users?.length || 0,
        totalRepresentatives,
        activeClients
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="mt-2 text-gray-600">
                  Welcome back, {currentUser?.first_name}! Here's an overview of your CRM.
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : stats.totalCompanies.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Companies in your database
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : stats.activeClients.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Companies with client status
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Representatives</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : stats.totalRepresentatives.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total company representatives
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Users</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : stats.totalUsers.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active system users
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href="/companies"
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Building2 className="h-8 w-8 text-blue-600 mb-2" />
                  <h3 className="font-medium text-gray-900">Manage Companies</h3>
                  <p className="text-sm text-gray-500">View and edit company information</p>
                </a>
                
                {currentUser?.role === 'Admin' && (
                  <a
                    href="/admin"
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Users className="h-8 w-8 text-green-600 mb-2" />
                    <h3 className="font-medium text-gray-900">User Management</h3>
                    <p className="text-sm text-gray-500">Manage system users and permissions</p>
                  </a>
                )}
                
                <a
                  href="/reminders"
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <TrendingUp className="h-8 w-8 text-purple-600 mb-2" />
                  <h3 className="font-medium text-gray-900">Reminders</h3>
                  <p className="text-sm text-gray-500">View and manage your reminders</p>
                </a>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
}