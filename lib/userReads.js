import { supabase } from './supabase';

// Function to get or create user read status for a company or representative
export const getUserReadStatus = async (userId, entityType, entityId) => {
  const column = entityType === 'company' ? 'company_id' : 'representative_id';
  
  const { data, error } = await supabase
    .from('user_reads')
    .select('*')
    .eq('user_id', userId)
    .eq(column, entityId)
    .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully
  
  if (error) {
    return { data: null, error };
  }
  
  if (!data) {
    // Record doesn't exist, need to get global mark_unread from the original table
    const table = entityType === 'company' ? 'companies' : 'representatives';
    const { data: globalData } = await supabase
      .from(table)
      .select('mark_unread')
      .eq('id', entityId)
      .single();
    
    return { data: { mark_unread: globalData?.mark_unread ?? true }, error: null };
  }
  
  return { data, error: null };
};

// Function to set user read status for a company or representative
export const setUserReadStatus = async (userId, entityType, entityId, markUnread) => {
  const column = entityType === 'company' ? 'company_id' : 'representative_id';
  const otherColumn = entityType === 'company' ? 'representative_id' : 'company_id';
  
  // First try to find existing record
  const { data: existingData } = await supabase
    .from('user_reads')
    .select('*')
    .eq('user_id', userId)
    .eq(column, entityId)
    .maybeSingle(); // Use maybeSingle() to avoid errors when no record found
  
  if (existingData) {
    // Update existing record
    const { data, error } = await supabase
      .from('user_reads')
      .update({ mark_unread: markUnread })
      .eq('user_id', userId)
      .eq(column, entityId)
      .select()
      .single();
    
    return { data, error };
  } else {
    // Insert new record
    const insertData = {
      user_id: userId,
      [column]: entityId,
      [otherColumn]: null,
      mark_unread: markUnread
    };
    
    const { data, error } = await supabase
      .from('user_reads')
      .insert(insertData)
      .select()
      .single();
    
    return { data, error };
  }
};

// Function to bulk set read status for multiple companies
export const bulkSetCompaniesReadStatus = async (userId, companyIds, markUnread) => {
  const results = [];
  const errors = [];
  
  for (const companyId of companyIds) {
    const { data, error } = await setUserReadStatus(userId, 'company', companyId, markUnread);
    if (data) results.push(data);
    if (error) errors.push(error);
  }
  
  return { 
    data: results, 
    error: errors.length > 0 ? errors[0] : null 
  };
};

// Function to bulk set read status for multiple representatives
export const bulkSetRepresentativesReadStatus = async (userId, representativeIds, markUnread) => {
  const results = [];
  const errors = [];
  
  for (const representativeId of representativeIds) {
    const { data, error } = await setUserReadStatus(userId, 'representative', representativeId, markUnread);
    if (data) results.push(data);
    if (error) errors.push(error);
  }
  
  return { 
    data: results, 
    error: errors.length > 0 ? errors[0] : null 
  };
};

// Function to get companies with user-specific read status
export const getCompaniesWithUserReadStatus = async (userId, page = 1, limit = 50, filters = {}) => {
  let baseQuery = supabase
    .from('companies')
    .select(`
      *,
      assigned_user:assigned_to(first_name, last_name),
      created_user:created_by(first_name, last_name),
      representatives(id, full_name, role, is_deleted)
    `)
    .eq('is_deleted', false);

  // Apply filters (same as before except for unread_filter)
  if (filters.status) {
    baseQuery = baseQuery.eq('status', filters.status);
  }
  
  if (filters.assigned_to) {
    if (filters.assigned_to === 'unassigned') {
      baseQuery = baseQuery.is('assigned_to', null);
    } else {
      baseQuery = baseQuery.eq('assigned_to', filters.assigned_to);
    }
  }
  
  if (filters.search) {
    baseQuery = baseQuery.or(`company_name.ilike.%${filters.search}%,industry.ilike.%${filters.search}%,location.ilike.%${filters.search}%`);
  }
  
  if (filters.created_from) {
    baseQuery = baseQuery.gte('created_at', filters.created_from);
  }
  
  if (filters.created_to) {
    baseQuery = baseQuery.lte('created_at', filters.created_to);
  }

  // Apply sorting
  const sortField = filters.sort_field || 'created_at';
  const sortOrder = filters.sort_order === 'asc';
  
  baseQuery = baseQuery.order(sortField, { ascending: sortOrder });
  
  // Add secondary sort by created_at if not already sorting by it
  if (sortField !== 'created_at') {
    baseQuery = baseQuery.order('created_at', { ascending: false });
  }

  // Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  baseQuery = baseQuery.range(from, to);

  const { data, error } = await baseQuery;

  if (error) {
    return { data: null, error };
  }

  // Get read status for all companies in this batch
  const companyIds = data.map(company => company.id);
  const { data: readStatusData } = await supabase
    .from('user_reads')
    .select('company_id, mark_unread')
    .eq('user_id', userId)
    .in('company_id', companyIds);

  // Create a map for quick lookup
  const readStatusMap = new Map();
  if (readStatusData) {
    readStatusData.forEach(status => {
      readStatusMap.set(status.company_id, status.mark_unread);
    });
  }

  // Transform the data to include user-specific read status
  // If no user-specific record exists, fall back to the global mark_unread from companies table
  const transformedData = data.map(company => ({
    ...company,
    mark_unread: readStatusMap.has(company.id) 
      ? readStatusMap.get(company.id) 
      : company.mark_unread // Fall back to global mark_unread from companies table
  }));

  // Apply unread filter after transformation
  let filteredData = transformedData;
  if (filters.unread_filter === 'unread_only') {
    filteredData = transformedData.filter(company => company.mark_unread);
  } else if (filters.unread_filter === 'read_only') {
    filteredData = transformedData.filter(company => !company.mark_unread);
  }

  return { data: filteredData, error: null };
};

// Function to get representatives with user-specific read status
export const getRepresentativesWithUserReadStatus = async (userId, page = 1, limit = 50, filters = {}) => {
  let baseQuery = supabase
    .from('representatives')
    .select(`
      *,
      company:company_id(company_name, status),
      assigned_user:assigned_to(first_name, last_name),
      contacted_user:contacted_by(first_name, last_name),
      created_user:created_by(first_name, last_name),
      user_exports!left(user_id)
    `)
    .eq('is_deleted', false);

  // Apply filters (same as before except for unread_filter)
  if (filters.company_ids && filters.company_ids.length > 0) {
    baseQuery = baseQuery.in('company_id', filters.company_ids);
  }
  
  if (filters.company_id) {
    if (filters.company_id === 'empty') {
      baseQuery = baseQuery.is('company_id', null);
    } else {
      baseQuery = baseQuery.eq('company_id', filters.company_id);
    }
  }
  
  if (filters.status) {
    if (filters.status === 'No Status') {
      // Handle null and empty status values
      baseQuery = baseQuery.or('status.is.null,status.eq.');
    } else {
      baseQuery = baseQuery.eq('status', filters.status);
    }
  }
  
  if (filters.assigned_to) {
    if (filters.assigned_to === 'unassigned') {
      baseQuery = baseQuery.is('assigned_to', null);
    } else {
      baseQuery = baseQuery.eq('assigned_to', filters.assigned_to);
    }
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
      baseQuery = baseQuery.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,role.ilike.%${searchTerm}%,company_id.in.(${companyIds.join(',')})${fullNameSearchConditions}`);
    } else {
      // Only search in representative fields, including full name search
      baseQuery = baseQuery.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,role.ilike.%${searchTerm}%${fullNameSearchConditions}`);
    }
  }
  
  if (filters.created_from) {
    baseQuery = baseQuery.gte('created_at', filters.created_from);
  }
  
  if (filters.created_to) {
    baseQuery = baseQuery.lte('created_at', filters.created_to);
  }

  // Apply sorting
  const sortField = filters.sort_field || 'created_at';
  const sortOrder = filters.sort_order === 'asc';
  
  baseQuery = baseQuery.order(sortField, { ascending: sortOrder });
  
  // Add secondary sort by created_at if not already sorting by it
  if (sortField !== 'created_at') {
    baseQuery = baseQuery.order('created_at', { ascending: false });
  }

  // Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  baseQuery = baseQuery.range(from, to);

  const { data, error } = await baseQuery;

  if (error) {
    return { data: null, error };
  }

  // Get read status for all representatives in this batch
  const representativeIds = data.map(rep => rep.id);
  const { data: readStatusData } = await supabase
    .from('user_reads')
    .select('representative_id, mark_unread')
    .eq('user_id', userId)
    .in('representative_id', representativeIds);

  // Create a map for quick lookup
  const readStatusMap = new Map();
  if (readStatusData) {
    readStatusData.forEach(status => {
      readStatusMap.set(status.representative_id, status.mark_unread);
    });
  }

  // Transform the data to include user-specific read status
  // If no user-specific record exists, fall back to the global mark_unread from representatives table
  const transformedData = data.map(representative => ({
    ...representative,
    mark_unread: readStatusMap.has(representative.id) 
      ? readStatusMap.get(representative.id) 
      : representative.mark_unread // Fall back to global mark_unread from representatives table
  }));

  // Apply unread filter after transformation
  let filteredData = transformedData;
  if (filters.unread_filter === 'unread_only') {
    filteredData = transformedData.filter(rep => rep.mark_unread);
  } else if (filters.unread_filter === 'read_only') {
    filteredData = transformedData.filter(rep => !rep.mark_unread);
  }

  return { data: filteredData, error: null };
};

// Function to mark a company as read (when user opens/views it)
export const markCompanyAsRead = async (userId, companyId) => {
  return await setUserReadStatus(userId, 'company', companyId, false);
};

// Function to mark a representative as read (when user opens/views it)
export const markRepresentativeAsRead = async (userId, representativeId) => {
  return await setUserReadStatus(userId, 'representative', representativeId, false);
};

// Function to get total counts for dashboard with user-specific read status
export const getEntityCountsWithUserReadStatus = async (userId) => {
  // Get total companies count
  const { count: totalCompanies } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false);

  // Get total representatives count  
  const { count: totalRepresentatives } = await supabase
    .from('representatives')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false);

  // Get all companies with their global mark_unread status
  const { data: allCompanies } = await supabase
    .from('companies')
    .select('id, mark_unread')
    .eq('is_deleted', false);

  // Get user-specific read status for companies
  const { data: companyReadStatus } = await supabase
    .from('user_reads')
    .select('company_id, mark_unread')
    .eq('user_id', userId)
    .not('company_id', 'is', null);

  const companyReadMap = new Map();
  if (companyReadStatus) {
    companyReadStatus.forEach(status => {
      companyReadMap.set(status.company_id, status.mark_unread);
    });
  }

  const unreadCompanies = allCompanies?.filter(company => 
    companyReadMap.has(company.id) 
      ? companyReadMap.get(company.id) 
      : company.mark_unread // Fall back to global mark_unread
  ).length || 0;

  // Get all representatives with their global mark_unread status
  const { data: allRepresentatives } = await supabase
    .from('representatives')
    .select('id, mark_unread')
    .eq('is_deleted', false);

  // Get user-specific read status for representatives
  const { data: repReadStatus } = await supabase
    .from('user_reads')
    .select('representative_id, mark_unread')
    .eq('user_id', userId)
    .not('representative_id', 'is', null);

  const repReadMap = new Map();
  if (repReadStatus) {
    repReadStatus.forEach(status => {
      repReadMap.set(status.representative_id, status.mark_unread);
    });
  }

  const unreadRepresentatives = allRepresentatives?.filter(rep => 
    repReadMap.has(rep.id) 
      ? repReadMap.get(rep.id) 
      : rep.mark_unread // Fall back to global mark_unread
  ).length || 0;

  return {
    totalCompanies,
    totalRepresentatives,
    unreadCompanies,
    unreadRepresentatives
  };
};
