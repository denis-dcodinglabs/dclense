import { supabase } from './supabase';

export const getUserReminders = async (userId) => {
  // Get representatives with reminder dates
  const { data: representatives, error: repError } = await supabase
    .from('representatives')
    .select(`
      *,
      company:company_id(company_name, status)
    `)
    .eq('assigned_to', userId)
    .not('reminder_date', 'is', null)
    .order('reminder_date', { ascending: true });

  // Get companies with last activity dates (acting as reminders)
  const { data: companies, error: compError } = await supabase
    .from('companies')
    .select('*')
    .eq('assigned_to', userId)
    .not('last_activity_date', 'is', null)
    .order('last_activity_date', { ascending: true });

  if (repError || compError) {
    return { data: null, error: repError || compError };
  }

  return {
    data: {
      representatives: representatives || [],
      companies: companies || []
    },
    error: null
  };
};

export const getUserNotifications = async (userId) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return { data, error };
};

export const markNotificationAsRead = async (notificationId) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .eq('id', notificationId);

  return { data, error };
};

export const markNotificationAsUnread = async (notificationId) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: false, updated_at: new Date().toISOString() })
    .eq('id', notificationId);

  return { data, error };
};

export const deleteNotification = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  return { error };
};

export const markAllNotificationsAsRead = async (userId) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false);

  return { data, error };
};

export const getUnreadNotificationCount = async (userId) => {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  return { count, error };
};