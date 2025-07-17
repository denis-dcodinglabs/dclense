import { supabase } from './supabase';

export const getAuditLogs = async (page = 1, limit = 50, filters = {}) => {
  let query = supabase
    .from('audit_logs')
    .select(`
      *,
      user:user_id(first_name, last_name, email)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.user_id) {
    query = query.eq('user_id', filters.user_id);
  }
  if (filters.action) {
    query = query.eq('action', filters.action);
  }
  if (filters.table_name) {
    query = query.eq('table_name', filters.table_name);
  }
  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to);
  }

  // Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  return { data, error, count };
};

export const getSystemLogs = async (page = 1, limit = 50, filters = {}) => {
  let query = supabase
    .from('system_logs')
    .select(`
      *,
      user:user_id(first_name, last_name, email)
    `)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.user_id) {
    query = query.eq('user_id', filters.user_id);
  }
  if (filters.action) {
    query = query.eq('action', filters.action);
  }
  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to);
  }

  // Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  return { data, error, count };
};

export const getExportLogs = async (page = 1, limit = 50, filters = {}) => {
  let query = supabase
    .from('export_logs')
    .select(`
      *,
      user:user_id(first_name, last_name, email)
    `)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.user_id) {
    query = query.eq('user_id', filters.user_id);
  }
  if (filters.export_type) {
    query = query.eq('export_type', filters.export_type);
  }
  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to);
  }

  // Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  return { data, error, count };
};

export const logSystemAction = async (userId, action, metadata = {}) => {
  const { error } = await supabase
    .from('system_logs')
    .insert([{
      user_id: userId,
      action,
      metadata,
      ip_address: null, // Could be populated from request if available
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
    }]);

  return { error };
};