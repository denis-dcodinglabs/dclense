import { supabase } from './supabase';
import { bulkDeleteRepresentatives, bulkAssignRepresentativesToMe, bulkAssignRepresentativesToUser, updateCompanyRepresentativesAssignedTo } from './representatives';
import { getCompaniesWithUserReadStatus, bulkSetCompaniesReadStatus, markCompanyAsRead } from './userReads';

export const getCompanies = async (page = 1, limit = 50, filters = {}) => {
  // Check if we have a current user to use user-specific read status
  if (filters.current_user_id) {
    // Use the new user-specific read status function
    const result = await getCompaniesWithUserReadStatus(filters.current_user_id, page, limit, filters);
    
    // Get total count
    const { count } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);
    
    return { data: result.data, error: result.error, count };
  }

  // Fallback to original logic for backward compatibility
  let query = supabase
    .from('companies')
    .select(`
      *,
      assigned_user:assigned_to(first_name, last_name),
      created_user:created_by(first_name, last_name),
      representatives(id, full_name, role, is_deleted)
    `)
    .eq('is_deleted', false); // Only get non-deleted companies

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
    if (filters.assigned_to === 'unassigned') {
      query = query.is('assigned_to', null);
    } else {
      query = query.eq('assigned_to', filters.assigned_to);
    }
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
    .eq('is_deleted', false)
    .single();
  return { data, error };
};

export const checkCompanyNameExists = async (companyName, excludeId = null) => {
  let query = supabase
    .from('companies')
    .select('id, company_name, industry, location, status, created_at')
    .eq('is_deleted', false)
    .ilike('company_name', companyName.trim().toLowerCase());
  
  // If updating a company, exclude the current company from the check
  if (excludeId) {
    query = query.neq('id', excludeId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return { exists: false, error, existingCompany: null };
  }
  
  const existingCompany = data && data.length > 0 ? data[0] : null;
  return { exists: !!existingCompany, error: null, existingCompany };
};

export const createCompany = async (companyData, userId) => {
  // Check if company name already exists
  const { exists, error: checkError, existingCompany } = await checkCompanyNameExists(companyData.company_name);
  
  if (checkError) {
    return { data: null, error: checkError };
  }
  
  if (exists) {
    return { 
      data: null, 
      error: { 
        message: 'A company with this name already exists',
        code: 'DUPLICATE_COMPANY_NAME',
        existingCompany
      } 
    };
  }

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
  // Check if company name already exists (excluding current company)
  if (companyData.company_name) {
    const { exists, error: checkError, existingCompany } = await checkCompanyNameExists(companyData.company_name, id);
    
    if (checkError) {
      return { data: null, error: checkError };
    }
    
    if (exists) {
      return { 
        data: null, 
        error: { 
          message: 'A company with this name already exists',
          code: 'DUPLICATE_COMPANY_NAME',
          existingCompany
        } 
      };
    }
  }

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

    // Check if assigned_to has changed and update representatives accordingly
    if (oldData && oldData.assigned_to !== data.assigned_to) {
      const newAssignedTo = data.assigned_to;
      
      // Update all representatives of this company to have the same assigned_to
      const { error: repError } = await updateCompanyRepresentativesAssignedTo(id, newAssignedTo, userId);
      
      if (repError) {
        console.error('Error updating representatives assigned_to:', repError);
        // Don't fail the company update if representative update fails
        // but log the error for debugging
      }
    }
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

  const { data, error } = await supabase
    .from('companies')
    .update({
      is_deleted: true,
      updated_by: userId
    })
    .eq('id', id)
    .select()
    .single();
  
  if (!error) {
    await logAudit(userId, 'delete', 'companies', id, oldData, data);

    // Also soft-delete all representatives belonging to this company
    const { data: reps } = await supabase
      .from('representatives')
      .select('id')
      .eq('company_id', id)
      .eq('is_deleted', false);

    const representativeIds = (reps || []).map((r) => r.id);
    if (representativeIds.length > 0) {
      await bulkDeleteRepresentatives(representativeIds, userId);
    }
  }
  
  return { data, error };
};

export const bulkDeleteCompanies = async (ids, userId) => {
  // Get old data first
  const { data: oldData } = await supabase
    .from('companies')
    .select('*')
    .in('id', ids);

  const { data, error } = await supabase
    .from('companies')
    .update({
      is_deleted: true,
      updated_by: userId
    })
    .in('id', ids)
    .select();
  
  if (!error) {
    for (const company of data || []) {
      const oldCompany = oldData?.find(old => old.id === company.id);
      await logAudit(userId, 'bulk_delete', 'companies', company.id, oldCompany, company);
    }

    // Also soft-delete all representatives belonging to the deleted companies
    const { data: reps } = await supabase
      .from('representatives')
      .select('id')
      .in('company_id', ids)
      .eq('is_deleted', false);

    const representativeIds = (reps || []).map((r) => r.id);
    if (representativeIds.length > 0) {
      await bulkDeleteRepresentatives(representativeIds, userId);
    }
  }
  
  return { data, error };
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

    // Also assign all representatives of these companies to the same user
    const { data: representatives } = await supabase
      .from('representatives')
      .select('id')
      .in('company_id', ids)
      .eq('is_deleted', false);

    if (representatives && representatives.length > 0) {
      const representativeIds = representatives.map(rep => rep.id);
      await bulkAssignRepresentativesToMe(representativeIds, userId);
    }
  }
  
  return { data, error };
};

export const bulkAssignCompaniesToUser = async (ids, assigneeUserId, currentUserId) => {
  // Get old data first for audit logging
  const { data: oldData } = await supabase
    .from('companies')
    .select('*')
    .in('id', ids);

  const { data, error } = await supabase
    .from('companies')
    .update({
      assigned_to: assigneeUserId,
      updated_by: currentUserId
    })
    .in('id', ids)
    .select();
  
  if (!error && data) {
    // Log audit for each company
    for (const company of data) {
      const oldCompany = oldData?.find(old => old.id === company.id);
      await logAudit(currentUserId, 'bulk_assign', 'companies', company.id, oldCompany, company);
    }

    // Also assign all representatives of these companies to the same user
    const { data: representatives } = await supabase
      .from('representatives')
      .select('id')
      .in('company_id', ids)
      .eq('is_deleted', false);

    if (representatives && representatives.length > 0) {
      const representativeIds = representatives.map(rep => rep.id);
      await bulkAssignRepresentativesToUser(representativeIds, assigneeUserId, currentUserId);
    }
  }
  
  return { data, error };
};

export const bulkMarkCompaniesReadUnread = async (ids, markUnread, userId) => {
  // Use the new user-specific read status approach
  const { data, error } = await bulkSetCompaniesReadStatus(userId, ids, markUnread);
  
  if (!error && data) {
    // Log audit for each company
    for (const readStatus of data) {
      await logAudit(userId, markUnread ? 'bulk_mark_unread' : 'bulk_mark_read', 'companies', readStatus.company_id, null, readStatus);
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