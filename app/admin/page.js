'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';
import Navbar from '@/components/Navbar';
import UserDialog from '@/components/UserDialog';
import UsersTable from '@/components/UsersTable';
import { Button } from '@/components/ui/button';
import { createUser, getUsers, updateUser, deleteUser } from '@/lib/users';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await getUsers();
    if (error) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setDialogOpen(true);
    setError('');
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setDialogOpen(true);
    setError('');
  };

  const handleDeleteUser = async (user) => {
    if (window.confirm(`Are you sure you want to delete ${user.first_name} ${user.last_name}?`)) {
      const { error } = await deleteUser(user.id);
      if (error) {
        setError('Failed to delete user');
        console.error('Error deleting user:', error);
      } else {
        await fetchUsers();
      }
    }
  };

  const handleSaveUser = async (userData) => {
    setSaving(true);
    setError('');

    try {
      let result;
      if (editingUser) {
        result = await updateUser(editingUser.id, userData);
      } else {
        result = await createUser(userData);
      }

      if (result.error) {
        if (result.error.code === '23505') {
          setError('A user with this email already exists');
        } else {
          setError('Failed to save user');
        }
        console.error('Error saving user:', result.error);
      } else {
        setDialogOpen(false);
        await fetchUsers();
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Unexpected error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setError('');
  };

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <p className="mt-2 text-gray-600">
                  Manage user accounts and permissions for your organization
                </p>
              </div>
              <Button onClick={handleAddUser} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {users.filter(u => u.role === 'Admin').length}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Admins</p>
                    <p className="text-xs text-gray-400">Full access</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 font-semibold text-sm">
                        {users.filter(u => u.role === 'Editor').length}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Editors</p>
                    <p className="text-xs text-gray-400">View/Edit</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 font-semibold text-sm">
                        {users.filter(u => u.role === 'Viewer').length}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Viewers</p>
                    <p className="text-xs text-gray-400">Read-only</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <UsersTable
            users={users}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
            loading={loading}
          />

          <UserDialog
            isOpen={dialogOpen}
            onClose={handleCloseDialog}
            onSave={handleSaveUser}
            user={editingUser}
            loading={saving}
          />
        </main>
      </div>
    </AdminProtectedRoute>
  );
}