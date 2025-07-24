import { supabase } from './supabase';

export const getCompanies = async (page = 1, limit = 50, filters = {}) => {
  let query = supabase
    .from('companies')
    .select(`
      *,
      assigned_user:assigned_to(first_name, last_name),
      created_user:created_by(first_name, last_name),
      representatives(id, full_name, role)
    `);

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.unread_filter === 'unread_only') {
    query = query.eq('mark_unread', true);
  }
  if (filters.unread_filter === 'read_only') {
    query = query.eq('mark_unread', false);
  }
  if (filters.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to);
  }
  if (filters.search) {
    query = query.or(`company_name.ilike.%${filters.search}%,industry.ilike.%${filters.search}%,location.ilike.%${filters.search}%`);
  }
  if (filters.created_from) {
    query = query.gte('created_at', filters.created_from);
  }
  if (filters.created_to) {
    query = query.lte('created_at', filters.created_to);
  }

  // Apply sorting
  const sortField = filters.sort_field || 'created_at';
  const sortOrder = filters.sort_order === 'asc';
  
  query = query.order(sortField, { ascending: sortOrder });
  
  // Add secondary sort by created_at if not already sorting by it
  if (sortField !== 'created_at') {
    query = query.order('created_at', { ascending: false });
  }

  // Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Get total count first
  const { count } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true });

  // Then get the paginated data
  query = query.range(from, to);
  const { data, error } = await query;
  
  return { data, error, count };
};

export const getCompanyById = async (id) => {
  const { data, error } = await supabase
    .from('companies')
    .select(`
      *,
      assigned_user:assigned_to(first_name, last_name),
      created_user:created_by(first_name, last_name),
      representatives(*)
    `)
    .eq('id', id)
    .single();
  return { data, error };
};

export const createCompany = async (companyData, userId) => {
  const { data, error } = await supabase
    .from('companies')
    .insert([{
      ...companyData,
      created_by: userId,
      updated_by: userId
    }])
    .select()
    .single();
  
  if (!error && data) {
    await logAudit(userId, 'create', 'companies', data.id, null, data);
  }
  
  return { data, error };
};

export const updateCompany = async (id, companyData, userId) => {
  // Get old data first
  const { data: oldData } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('companies')
    .update({
      ...companyData,
      updated_by: userId
    })
    .eq('id', id)
    .select()
    .single();
  
  if (!error && data) {
    await logAudit(userId, 'update', 'companies', id, oldData, data);
  }
  
  return { data, error };
};

export const deleteCompany = async (id, userId) => {
  // Get old data first
  const { data: oldData } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', id);
  
  if (!error) {
    await logAudit(userId, 'delete', 'companies', id, oldData, null);
  }
  
  return { error };
};

export const bulkDeleteCompanies = async (ids, userId) => {
  // Get old data first
  const { data: oldData } = await supabase
    .from('companies')
    .select('*')
    .in('id', ids);

  const { error } = await supabase
    .from('companies')
    .delete()
    .in('id', ids);
  
  if (!error) {
    for (const company of oldData || []) {
      await logAudit(userId, 'bulk_delete', 'companies', company.id, company, null);
    }
  }
  
  return { error };
};

export const bulkAssignCompaniesToMe = async (ids, userId) => {
  // Get old data first for audit logging
  const { data: oldData } = await supabase
    .from('companies')
    .select('*')
    .in('id', ids);

  const { data, error } = await supabase
    .from('companies')
    .update({
      assigned_to: userId,
      updated_by: userId
    })
    .in('id', ids)
    .select();
  
  if (!error && data) {
    // Log audit for each company
    for (const company of data) {
      const oldCompany = oldData?.find(old => old.id === company.id);
      await logAudit(userId, 'bulk_assign', 'companies', company.id, oldCompany, company);
    }
  }
  
  return { data, error };
};

const logAudit = async (userId, action, tableName, recordId, oldValues, newValues) => {
  await supabase
    .from('audit_logs')
    .insert([{
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues,
      new_values: newValues
    }]);
};