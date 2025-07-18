'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Users, Building2, BarChart3, FileText, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/sonner';
import { signOut, getCurrentUserWithRole } from '@/lib/auth';
import { getUnreadNotificationCount } from '@/lib/reminders';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUserWithRole();
      setUser(currentUser);
      
      if (currentUser) {
        fetchUnreadCount(currentUser.id);
        requestNotificationPermission();
        
        // Set up real-time subscription for notification count
        setupNotificationSubscription(currentUser.id);
      }
    };
    fetchUser();
  }, []);

  const setupNotificationSubscription = async (userId) => {
    try {
      const { supabase } = await import('@/lib/supabase');
    
      const subscription = supabase
        .channel(`notification_count_${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log('New notification received:', payload.new);
            setUnreadCount(prev => prev + 1);
            
            // Show browser notification or toast
            showBrowserNotification(
              payload.new.title,
              payload.new.message
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log('Notification updated:', payload);
            // Refetch count for updates (mark as read/unread)
            fetchUnreadCount(userId);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log('Notification deleted:', payload);
            // Refetch count for deletions
            fetchUnreadCount(userId);
          }
        )
        .subscribe((status) => {
          console.log('Notification subscription status:', status);
          if (status === 'CHANNEL_ERROR') {
            console.error('Failed to subscribe to notifications - this may be due to RLS policies');
            // Fallback: just fetch count periodically instead of real-time
            const interval = setInterval(() => {
              fetchUnreadCount(userId);
            }, 30000); // Check every 30 seconds
            
            return () => clearInterval(interval);
          }
        });

      // Cleanup function
      return () => {
        console.log('Unsubscribing from notifications');
        if (subscription) {
          supabase.removeChannel(subscription);
        }
      };
    } catch (error) {
      console.error('Error setting up notification subscription:', error);
      // Fallback: fetch count periodically
      const interval = setInterval(() => {
        fetchUnreadCount(userId);
      }, 30000);
      
      return () => {}; // Return empty cleanup function
    }
  };
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
        icon: '/favicon.ico',
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
  const fetchUnreadCount = async (userId) => {
    console.log('Fetching unread count for user:', userId);
    const { count } = await getUnreadNotificationCount(userId);
    console.log('Unread count fetched:', count);
    setUnreadCount(count || 0);
  };

  const handleSignOut = async () => {
    setLoading(true);
    const { error } = await signOut();
    if (!error) {
      router.push('/');
    }
    setLoading(false);
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
              DCLense
            </Link>
          </div>
          
          <div className="flex items-center space-x-6">
            <Link 
              href="/dashboard"
              className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm font-medium">Representatives</span>
            </Link>
            
            <Link 
              href="/companies" 
              className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
            >
              <Building2 className="h-4 w-4" />
              <span className="text-sm font-medium">Companies</span>
            </Link>
            
            <Link 
              href="/reminders" 
              className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors relative"
            >
              <Bell className="h-4 w-4" />
              <span className="text-sm font-medium">
                Reminders
                {unreadCount > 0 && (
                  <Badge className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5">
                    {unreadCount}
                  </Badge>
                )}
              </span>
            </Link>
            
            {user?.role === 'Admin' && (
              <Link 
                href="/logs" 
                className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">Logs</span>
              </Link>
            )}
            
            {user?.role === 'Admin' && (
              <Link 
                href="/admin" 
                className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
              >
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Admin</span>
              </Link>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {user && (
              <span className="text-gray-700 text-sm">
                Welcome, {user.first_name || user.email}
              </span>
            )}
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      </div>
      <Toaster />
    </nav>
  );
}