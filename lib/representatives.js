import { supabase } from './supabase';
import { getRepresentativesWithUserReadStatus, bulkSetRepresentativesReadStatus, markRepresentativeAsRead } from './userReads';

export const getRepresentatives = async (page = 1, limit = 50, filters = {}) => {
  const currentUser = filters.current_user_id;
  
  // Check if we have a current user to use user-specific read status
  if (currentUser) {
    // Use the new user-specific read status function
    const result = await getRepresentativesWithUserReadStatus(currentUser, page, limit, filters);
    
    // Get total count
    const { count } = await supabase
      .from('representatives')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);
    
    return { data: result.data, error: result.error, count };
  }
  
  // Fallback to original logic for backward compatibility
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
    if (filters.status === 'No Status') {
      // Handle null and empty status values
      query = query.or('status.is.null,status.eq.');
    } else {
      query = query.eq('status', filters.status);
    }
  }
  if (filters.unread_filter) {
    if (filters.unread_filter === 'unread_only') {
      query = query.eq('mark_unread', true);
    } else if (filters.unread_filter === 'read_only') {
      query = query.eq('mark_unread', false);
    }
  }
  if (filters.assigned_to) {
    if (filters.assigned_to === 'unassigned') {
      query = query.is('assigned_to', null);
    } else {
      query = query.eq('assigned_to', filters.assigned_to);
    }
  }
  if (filters.contacted_by && filters.contacted_by.length > 0) {
    query = query.in('contacted_by', filters.contacted_by);
  }
  if (filters.search) {
    const searchTerm = filters.search.trim();
    
    // First get company IDs that match the search term
    const { data: matchingCompanies } = await supabase
      .from('companies')
      .select('id')
      .ilike('company_name', `%${searchTerm}%`);
    
    const companyIds = matchingCompanies?.map(c => c.id) || [];
    
    // Create search conditions for full name (handle "John Doe" searches)
    const searchWords = searchTerm.split(' ').filter(word => word.length > 0);
    let fullNameSearchConditions = '';
    
    if (searchWords.length >= 2) {
      // If there are multiple words, also search for full name combinations
      const firstName = searchWords[0];
      const lastName = searchWords.slice(1).join(' ');
      fullNameSearchConditions = `,and(first_name.ilike.%${firstName}%,last_name.ilike.%${lastName}%)`;
    }
    
    if (companyIds.length > 0) {
      // Search in representative fields OR company IDs, including full name search
      query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,role.ilike.%${searchTerm}%,company_id.in.(${companyIds.join(',')})${fullNameSearchConditions}`);
    } else {
      // Only search in representative fields, including full name search
      query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,role.ilike.%${searchTerm}%${fullNameSearchConditions}`);
    }
  }
  if (filters.exported_filter === 'exported_only') {
    // Use a subquery to get representatives that have been exported by current user
    if (currentUser) {
      const { data: exportedReps } = await supabase
        .from('user_exports')
        .select('representative_id')
        .eq('user_id', currentUser);
      
      if (exportedReps && exportedReps.length > 0) {
        const exportedIds = exportedReps.map(exp => exp.representative_id);
        query = query.in('id', exportedIds);
      } else {
        // No exports found, return empty result
        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }
  }
  if (filters.exported_filter === 'not_exported_only') {
    // Use a subquery to get representatives that have NOT been exported by current user
    if (currentUser) {
      const { data: exportedReps } = await supabase
        .from('user_exports')
        .select('representative_id')
        .eq('user_id', currentUser);
      
      if (exportedReps && exportedReps.length > 0) {
        const exportedIds = exportedReps.map(exp => exp.representative_id);
        // Use NOT IN to exclude exported representatives
        for (const exportedId of exportedIds) {
          query = query.neq('id', exportedId);
        }
      }
      // If no exports found, all representatives are "not exported" so no additional filter needed
    }
    // If no exports found, all representatives are "not exported"
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
  
  return { data, error, count };
};

export const checkDuplicateRepresentative = async (fullName, companyId, excludeId = null) => {
  let query = supabase
    .from('representatives')
    .select('id, full_name, company:company_id(company_name)')
    .eq('full_name', fullName)
    .eq('is_deleted', false);

  if (companyId) {
    query = query.eq('company_id', companyId);
  } else {
    query = query.is('company_id', null);
  }

  // Exclude the current representative when editing
  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;
  
  return { data, error };
};

export const createRepresentative = async (repData, userId) => {
  // Check for duplicates before creating
  const duplicateCheck = await checkDuplicateRepresentative(repData.full_name, repData.company_id);
  
  if (duplicateCheck.error) {
    return { data: null, error: duplicateCheck.error };
  }
  
  if (duplicateCheck.data && duplicateCheck.data.length > 0) {
    const duplicate = duplicateCheck.data[0];
    const companyName = duplicate.company?.company_name || 'No Company';
    return { 
      data: null, 
      error: { 
        message: `A representative named "${repData.full_name}" already exists for ${companyName}. Please use a different name or select a different company.`,
        code: 'DUPLICATE_REPRESENTATIVE'
      }
    };
  }

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

  // Check for duplicates if full_name is being updated
  if (repData.full_name) {
    const duplicateCheck = await checkDuplicateRepresentative(repData.full_name, repData.company_id, id);
    
    if (duplicateCheck.error) {
      return { data: null, error: duplicateCheck.error };
    }
    
    if (duplicateCheck.data && duplicateCheck.data.length > 0) {
      const duplicate = duplicateCheck.data[0];
      const companyName = duplicate.company?.company_name || 'No Company';
      return { 
        data: null, 
        error: { 
          message: `A representative named "${repData.full_name}" already exists for ${companyName}. Please use a different name or select a different company.`,
          code: 'DUPLICATE_REPRESENTATIVE'
        }
      };
    }
  }

  const { data, error } = await supabase
    .from('representatives')
    .update({
      ...repData,
      updated_by: userId,
      updated_at: new Date().toISOString()
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
      updated_by: userId,
      updated_at: new Date().toISOString()
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
      updated_by: userId,
      updated_at: new Date().toISOString()
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
      updated_by: userId,
      updated_at: new Date().toISOString()
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

export const bulkAssignRepresentativesToUser = async (ids, assigneeUserId, currentUserId) => {
  // Get old data first for audit logging
  const { data: oldData } = await supabase
    .from('representatives')
    .select('*')
    .in('id', ids);

  const { data, error } = await supabase
    .from('representatives')
    .update({
      assigned_to: assigneeUserId,
      updated_by: currentUserId,
      updated_at: new Date().toISOString()
    })
    .in('id', ids)
    .select();
  
  if (!error && data) {
    // Log audit for each representative
    for (const rep of data) {
      const oldRep = oldData?.find(old => old.id === rep.id);
      await logAudit(currentUserId, 'bulk_assign', 'representatives', rep.id, oldRep, rep);
    }
  }
  
  return { data, error };
};

export const bulkMarkRepresentativesReadUnread = async (ids, markUnread, userId) => {
  // Use the new user-specific read status approach
  const { data, error } = await bulkSetRepresentativesReadStatus(userId, ids, markUnread);
  
  if (!error && data) {
    // Log audit for each representative
    for (const readStatus of data) {
      await logAudit(userId, markUnread ? 'bulk_mark_unread' : 'bulk_mark_read', 'representatives', readStatus.representative_id, null, readStatus);
    }
  }
  
  return { data, error };
};

export const updateCompanyRepresentativesAssignedTo = async (companyId, assignedTo, userId) => {
  // First get all representatives for this company
  const { data: representatives, error: fetchError } = await supabase
    .from('representatives')
    .select('id')
    .eq('company_id', companyId)
    .eq('is_deleted', false);

  if (fetchError) {
    return { data: null, error: fetchError };
  }

  if (!representatives || representatives.length === 0) {
    // No representatives to update
    return { data: [], error: null };
  }

  const representativeIds = representatives.map(rep => rep.id);

  // Get old data first for audit logging
  const { data: oldData } = await supabase
    .from('representatives')
    .select('*')
    .in('id', representativeIds);

  // Update all representatives' assigned_to
  const { data, error } = await supabase
    .from('representatives')
    .update({
      assigned_to: assignedTo,
      updated_by: userId,
      updated_at: new Date().toISOString()
    })
    .in('id', representativeIds)
    .select();
  
  if (!error && data) {
    // Log audit for each representative
    for (const rep of data) {
      const oldRep = oldData?.find(old => old.id === rep.id);
      await logAudit(userId, 'company_assign_update', 'representatives', rep.id, oldRep, rep);
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