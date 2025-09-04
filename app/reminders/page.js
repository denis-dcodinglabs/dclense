'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Calendar, Bell, BellOff, Trash2, Eye, EyeOff, Building2, User, Clock, CheckCircle, Edit, RotateCcw } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import RepresentativeDetailModal from '@/components/RepresentativeDetailModal';
import RepresentativeDialog from '@/components/RepresentativeDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { getCurrentUserWithRole } from '@/lib/auth';
import { getUserReminders, getUserNotifications, markNotificationAsRead, markNotificationAsUnread, deleteNotification, markAllNotificationsAsRead } from '@/lib/reminders';
import { updateRepresentative } from '@/lib/representatives';
import { setUserReadStatus } from '@/lib/userReads';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return `${Math.abs(diffDays)} days overdue`;
  } else if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else {
    return `In ${diffDays} days`;
  }
};

const getUrgencyColor = (dateString) => {
  if (!dateString) return 'bg-gray-100 text-gray-800';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return 'bg-red-100 text-red-800 border-red-200';
  } else if (diffDays === 0) {
    return 'bg-orange-100 text-orange-800 border-orange-200';
  } else if (diffDays <= 3) {
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  } else {
    return 'bg-green-100 text-green-800 border-green-200';
  }
};

export default function RemindersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [reminders, setReminders] = useState({ representatives: [], companies: [] });
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reminders');
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [isRepModalOpen, setIsRepModalOpen] = useState(false);
  const [selectedRepresentativeId, setSelectedRepresentativeId] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRepresentative, setEditingRepresentative] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editErrorMessage, setEditErrorMessage] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedRepForDelete, setSelectedRepForDelete] = useState(null);

  useEffect(() => {
    fetchCurrentUser();
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchReminders();
      fetchNotifications();
      
      // Set up real-time subscription for notifications
      const subscription = setupNotificationSubscription();
      
      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    }
  }, [currentUser]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };

  const showBrowserNotification = (title, message) => {
    if (notificationPermission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico', // You can add a custom icon
        badge: '/favicon.ico',
        tag: 'dclense-notification',
        requireInteraction: false,
        silent: false
      });
    } else {
      // Fallback to toast notification
      toast.info(title, {
        description: message,
        duration: 10000,
        position: 'top-right',
      });
    }
  };

  const fetchCurrentUser = async () => {
    const user = await getCurrentUserWithRole();
    setCurrentUser(user);
  };

  const fetchReminders = async () => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await getUserReminders(currentUser.id);
      if (!error) {
        setReminders(data);
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  const fetchNotifications = async () => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await getUserNotifications(currentUser.id);
      if (!error) {
        setNotifications(data || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupNotificationSubscription = () => {
    const { supabase } = require('@/lib/supabase');
    
    return supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
          
          // Show browser notification or toast
          showBrowserNotification(
            payload.new.title,
            payload.new.message
          );
        }
      )
      .subscribe();
  };

  const handleMarkAsRead = async (notificationId) => {
    const { error } = await markNotificationAsRead(notificationId);
    if (!error) {
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
    }
  };

  const handleMarkAsUnread = async (notificationId) => {
    const { error } = await markNotificationAsUnread(notificationId);
    if (!error) {
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, is_read: false } : notif
        )
      );
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    const { error } = await deleteNotification(notificationId);
    if (!error) {
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    }
  };

  const handleMarkAllAsRead = async () => {
    const { error } = await markAllNotificationsAsRead(currentUser.id);
    if (!error) {
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleRepresentativeClick = (repId) => {
    setSelectedRepresentativeId(repId);
    setIsRepModalOpen(true);
  };

  const handleCloseRepModal = () => {
    setIsRepModalOpen(false);
    setSelectedRepresentativeId(null);
  };

  const handleEditRepresentative = (representative) => {
    setEditingRepresentative(representative);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingRepresentative(null);
    setEditErrorMessage(null);
  };

  const handleSaveRepresentative = async (repData, userReadStatus = null) => {
    if (!editingRepresentative || !currentUser) return;

    setEditLoading(true);
    setEditErrorMessage(null); // Clear any previous errors
    try {
      const result = await updateRepresentative(editingRepresentative.id, repData, currentUser.id);
      
      if (!result.error) {
        // Handle user-specific read status if provided
        if (userReadStatus && userReadStatus.isUserSpecific && result.data) {
          await setUserReadStatus(currentUser.id, 'representative', result.data.id, userReadStatus.mark_unread);
        }
        
        toast.success('Representative updated successfully');
        setEditErrorMessage(null);
        // Refresh the reminders to show updated data
        await fetchReminders();
        handleCloseEditDialog();
      } else {
        // Handle duplicate error or other errors
        if (result.error.code === 'DUPLICATE_REPRESENTATIVE') {
          setEditErrorMessage(result.error.message);
          toast.error(result.error.message);
        } else {
          const errorMessage = 'Failed to update representative: ' + (result.error.message || 'Unknown error');
          setEditErrorMessage(errorMessage);
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      console.error('Error updating representative:', error);
      const errorMessage = 'An unexpected error occurred while updating the representative';
      setEditErrorMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setEditLoading(false);
    }
  };

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Belgrade' });
  const handleDone = async (rep) => {
    const newFollowUp = [...(rep.follow_up_dates || []), today];
    const updatedData = { follow_up_dates: newFollowUp };
    const result = await updateRepresentative(rep.id, updatedData, currentUser.id);
    if (!result.error) {
      toast.success('Marked as done! Today\'s date added to follow-up dates.');
      fetchReminders();
    } else {
      toast.error('Failed to mark as done: ' + (result.error.message || 'Unknown error'));
    }
  };

  const handleUndo = async (rep) => {
    const newFollowUp = (rep.follow_up_dates || []).filter(d => d !== today);
    const updatedData = { follow_up_dates: newFollowUp };
    const result = await updateRepresentative(rep.id, updatedData, currentUser.id);
    if (!result.error) {
      toast.success('Undo successful! Today\'s date removed from follow-up dates.');
      fetchReminders();
    } else {
      toast.error('Failed to undo: ' + (result.error.message || 'Unknown error'));
    }
  };

  const handleOpenDeleteConfirm = (rep) => {
    setSelectedRepForDelete(rep);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRepForDelete) return;
    const updatedData = { reminder_date: null };
    const result = await updateRepresentative(selectedRepForDelete.id, updatedData, currentUser.id);
    if (!result.error) {
      toast.success('Reminder date cleared successfully');
      fetchReminders();
    } else {
      toast.error('Failed to clear reminder date: ' + (result.error.message || 'Unknown error'));
    }
    setIsDeleteConfirmOpen(false);
    setSelectedRepForDelete(null);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Bell className="h-8 w-8 mr-3" />
                  Reminders & Notifications
                  {unreadCount > 0 && (
                    <Badge className="ml-3 bg-red-500 text-white">
                      {unreadCount}
                    </Badge>
                  )}
                </h1>
                <p className="mt-2 text-gray-600">
                  Stay on top of your assignments and upcoming reminders
                </p>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="reminders" className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Reminders
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
                {unreadCount > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reminders" className="space-y-6">
              {/* Representatives Reminders */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Representative Reminders ({reminders.representatives.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reminders.representatives.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No representative reminders found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reminders.representatives.map((rep) => (
                        <div key={rep.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center">
                                  <span className="text-sm font-medium text-white">
                                    {rep.first_name?.[0]}{rep.last_name?.[0]}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-3">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleRepresentativeClick(rep.id)}
                                    className="text-lg font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left"
                                  >
                                    {rep.first_name} {rep.last_name}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditRepresentative(rep);
                                    }}
                                    className="text-gray-500 hover:text-blue-600 transition-colors p-1"
                                    title="Edit representative"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                </div>
                                <p className="text-sm text-gray-600">{rep.role}</p>
                                {rep.company && (
                                  <p className="text-sm text-gray-500">
                                    <Building2 className="h-3 w-3 inline mr-1" />
                                    {rep.company.company_name}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-2">
                              <Badge className={`${getUrgencyColor(rep.reminder_date)} border`}>
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDate(rep.reminder_date)}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {new Date(rep.reminder_date).toLocaleDateString()}
                              </span>
                              <div className="flex items-center space-x-2 mt-2">
                                {!(rep.follow_up_dates?.some(d => d === today) ?? false) ? (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleDone(rep)}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Done
                                  </Button>
                                ) : (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleUndo(rep)}
                                  >
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Undo
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-800"
                                  onClick={() => handleOpenDeleteConfirm(rep)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          {rep.notes && (
                            <div className="mt-3 p-3 bg-gray-50 rounded">
                              <p className="text-sm text-gray-700">{rep.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Companies Reminders */}
              {/* <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building2 className="h-5 w-5 mr-2" />
                    Company Reminders ({reminders.companies.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reminders.companies.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No company reminders found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reminders.companies.map((company) => (
                        <div key={company.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                                  <span className="text-sm font-medium text-white">
                                    {company.company_name?.charAt(0)}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-3">
                                <h3 className="text-lg font-medium text-gray-900">
                                  {company.company_name}
                                </h3>
                                <p className="text-sm text-gray-600">{company.industry}</p>
                                <p className="text-sm text-gray-500">{company.location}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-2">
                              <Badge className={`${getUrgencyColor(company.last_activity_date)} border`}>
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDate(company.last_activity_date)}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {new Date(company.last_activity_date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          {company.notes && (
                            <div className="mt-3 p-3 bg-gray-50 rounded">
                              <p className="text-sm text-gray-700">{company.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card> */}
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <Bell className="h-5 w-5 mr-2" />
                      Notifications ({notifications.length})
                    </CardTitle>
                    {unreadCount > 0 && (
                      <Button onClick={handleMarkAllAsRead} variant="outline" size="sm">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark All as Read
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {notifications.length === 0 ? (
                    <div className="text-center py-8">
                      <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No notifications found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {notifications.map((notification) => (
                        <div 
                          key={notification.id} 
                          className={`border rounded-lg p-4 transition-colors ${
                            notification.is_read ? 'bg-white' : 'bg-blue-50 border-blue-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start">
                              <div className="flex-shrink-0 mr-3">
                                {notification.entity_type === 'representative' ? (
                                  <User className="h-5 w-5 text-green-600" />
                                ) : (
                                  <Building2 className="h-5 w-5 text-blue-600" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <h3 className="text-sm font-medium text-gray-900">
                                    {notification.title}
                                  </h3>
                                  {!notification.is_read && (
                                    <div className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                  {new Date(notification.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => notification.is_read ? handleMarkAsUnread(notification.id) : handleMarkAsRead(notification.id)}
                                className="text-gray-600 hover:text-gray-800"
                              >
                                {notification.is_read ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteNotification(notification.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      <Toaster />
      
      {/* Representative Detail Modal */}
      <RepresentativeDetailModal 
        isOpen={isRepModalOpen}
        onClose={handleCloseRepModal}
        representativeId={selectedRepresentativeId}
      />
      
      {/* Representative Edit Dialog */}
      <RepresentativeDialog 
        isOpen={isEditDialogOpen}
        onClose={handleCloseEditDialog}
        onSave={handleSaveRepresentative}
        representative={editingRepresentative}
        loading={editLoading}
        errorMessage={editErrorMessage}
        onClearError={() => setEditErrorMessage(null)}
      />

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear the reminder date for this representative?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  );
}