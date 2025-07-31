import { supabase } from './supabase';

export const getRepresentatives = async (page = 1, limit = 50, filters = {}) => {
  let query = supabase
    .from('representatives')
    .select(`
      *,
      company:company_id(company_name, status),
      assigned_user:assigned_to(first_name, last_name),
      contacted_user:contacted_by(first_name, last_name),
      created_user:created_by(first_name, last_name),
      user_exports!left(user_id)
    `)
    .eq('is_deleted', false); // Only get non-deleted representatives

  // Apply filters
  if (filters.company_ids && filters.company_ids.length > 0) {
    query = query.in('company_id', filters.company_ids);
  }
  if (filters.company_id) {
    if (filters.company_id === 'empty') {
      query = query.is('company_id', null);
    } else {
      query = query.eq('company_id', filters.company_id);
    }
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.unread_filter) {
    if (filters.unread_filter === 'unread_only') {
      query = query.eq('mark_unread', true);
    } else if (filters.unread_filter === 'read_only') {
      query = query.eq('mark_unread', false);
    }
  }
  if (filters.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to);
  }
  if (filters.contacted_by && filters.contacted_by.length > 0) {
    query = query.in('contacted_by', filters.contacted_by);
  }
  if (filters.search) {
    // First get company IDs that match the search term
    const { data: matchingCompanies } = await supabase
      .from('companies')
      .select('id')
      .ilike('company_name', `%${filters.search}%`);
    
    const companyIds = matchingCompanies?.map(c => c.id) || [];
    
    if (companyIds.length > 0) {
      // Search in representative fields OR company IDs
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,role.ilike.%${filters.search}%,company_id.in.(${companyIds.join(',')})`);
    } else {
      // Only search in representative fields
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,role.ilike.%${filters.search}%`);
    }
  }
  if (filters.exported_filter === 'exported_only') {
    // Only show representatives exported by current user
    if (filters.current_user_id) {
      query = query.not('user_exports.user_id', 'is', null)
                   .eq('user_exports.user_id', filters.current_user_id);
    }
  }
  if (filters.exported_filter === 'not_exported_only') {
    // Only show representatives NOT exported by current user
    if (filters.current_user_id) {
      // This is more complex - we need to use a NOT EXISTS subquery
      const { data: exportedIds } = await supabase
        .from('user_exports')
        .select('representative_id')
        .eq('user_id', filters.current_user_id);
      
      const exportedRepIds = exportedIds?.map(e => e.representative_id) || [];
      if (exportedRepIds.length > 0) {
        query = query.not('id', 'in', `(${exportedRepIds.join(',')})`);
      }
    }
  }

  // Representative position filter
  if (filters.rep_position) {
    const position = parseInt(filters.rep_position);
    
    // Use a subquery to get representatives at the specified position within each company
    const { data: positionData, error: positionError } = await supabase.rpc('get_representatives_by_position', {
      target_position: position
    });
    
    if (positionError) {
      console.error('Error getting representatives by position:', positionError);
    } else if (positionData && positionData.length > 0) {
      const repIds = positionData.map(rep => rep.id);
      query = query.in('id', repIds);
    } else {
      // If no representatives found at this position, return empty result
      query = query.eq('id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID
    }
  }

  // Apply sorting
  const sortField = filters.sort_field || 'created_at';
  const sortOrder = filters.sort_order === 'asc';
  
  if (sortField === 'company_name') {
    // For company name sorting, we need to join and sort by the company table
    query = query.order('company_name', { ascending: sortOrder, foreignTable: 'company' });
  } else if (sortField === 'full_name') {
    // Sort by full_name (which combines first_name and last_name)
    query = query.order('full_name', { ascending: sortOrder });
  } else {
    // For other fields (created_at, updated_at, reminder_date)
    query = query.order(sortField, { ascending: sortOrder });
  }
  
  // Add secondary sort by created_at if not already sorting by it
  if (sortField !== 'created_at') {
    query = query.order('created_at', { ascending: false });
  }
  // Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Get total count first
  const { count } = await supabase
    .from('representatives')
    .select('*', { count: 'exact', head: true });

  // Then get the paginated data
  query = query.range(from, to);
  const { data, error } = await query;
  
  // Add is_exported_by_user flag to each representative
  const processedData = data?.map(rep => ({
    ...rep,
    is_exported_by_user: rep.user_exports?.some(exp => exp.user_id === filters.current_user_id) || false
  })) || [];
  
  return { data: processedData, error, count };
};

export const createRepresentative = async (repData, userId) => {
  const { data, error } = await supabase
    .from('representatives')
    .insert([{
      ...repData,
      mark_unread: repData.mark_unread !== undefined ? repData.mark_unread : true,
      created_by: userId,
      updated_by: userId
    }])
    .select()
    .single();
  
  if (!error && data) {
    await logAudit(userId, 'create', 'representatives', data.id, null, data);
  }
  
  return { data, error };
};

export const updateRepresentative = async (id, repData, userId) => {
  // Get old data first
  const { data: oldData } = await supabase
    .from('representatives')
    .select('*')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('representatives')
    .update({
      ...repData,
      updated_by: userId
    })
    .eq('id', id)
    .select()
    .single();
  
  if (!error && data) {
    await logAudit(userId, 'update', 'representatives', id, oldData, data);
  }
  
  return { data, error };
};

export const deleteRepresentative = async (id, userId) => {
  // Get old data first
  const { data: oldData } = await supabase
    .from('representatives')
    .select('*')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('representatives')
    .update({
      is_deleted: true,
      updated_by: userId
    })
    .eq('id', id)
    .select()
    .single();
  
  if (!error) {
    await logAudit(userId, 'delete', 'representatives', id, oldData, data);
  }
  
  return { data, error };
};

export const bulkDeleteRepresentatives = async (ids, userId) => {
  // Get old data first
  const { data: oldData } = await supabase
    .from('representatives')
    .select('*')
    .in('id', ids);

  const { data, error } = await supabase
    .from('representatives')
    .update({
      is_deleted: true,
      updated_by: userId
    })
    .in('id', ids)
    .select();
  
  if (!error) {
    for (const rep of data || []) {
      const oldRep = oldData?.find(old => old.id === rep.id);
      await logAudit(userId, 'bulk_delete', 'representatives', rep.id, oldRep, rep);
    }
  }
  
  return { data, error };
};

export const assignToMe = async (id, userId) => {
  const { data, error } = await updateRepresentative(id, { assigned_to: userId }, userId);
  return { data, error };
};

export const bulkAssignRepresentativesToMe = async (ids, userId) => {
  // Get old data first for audit logging
  const { data: oldData } = await supabase
    .from('representatives')
    .select('*')
    .in('id', ids);

  const { data, error } = await supabase
    .from('representatives')
    .update({
      assigned_to: userId,
      updated_by: userId
    })
    .in('id', ids)
    .select();
  
  if (!error && data) {
    // Log audit for each representative
    for (const rep of data) {
      const oldRep = oldData?.find(old => old.id === rep.id);
      await logAudit(userId, 'bulk_assign', 'representatives', rep.id, oldRep, rep);
    }
  }
  
  return { data, error };
};

export const bulkMarkRepresentativesReadUnread = async (ids, markUnread, userId) => {
  // Get old data first for audit logging
  const { data: oldData } = await supabase
    .from('representatives')
    .select('*')
    .in('id', ids);

  const { data, error } = await supabase
    .from('representatives')
    .update({
      mark_unread: markUnread,
      updated_by: userId
    })
    .in('id', ids)
    .select();
  
  if (!error && data) {
    // Log audit for each representative
    for (const rep of data) {
      const oldRep = oldData?.find(old => old.id === rep.id);
      await logAudit(userId, markUnread ? 'bulk_mark_unread' : 'bulk_mark_read', 'representatives', rep.id, oldRep, rep);
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