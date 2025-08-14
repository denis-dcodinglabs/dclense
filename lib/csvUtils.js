import { supabase } from './supabase';

export const getAllCompaniesForExport = async (filters = {}) => {
  let query = supabase
    .from('companies')
    .select(`
      *,
      assigned_user:assigned_to(first_name, last_name),
      created_user:created_by(first_name, last_name),
      representatives(id, full_name, role)
    `)
    .eq('is_deleted', false); // Only export non-deleted companies

  // Apply the same filters as the main companies page
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

  const { data, error } = await query;
  return { data, error };
};

export const getAllRepresentativesForExport = async (filters = {}) => {
  let query = supabase
    .from('representatives')
    .select(`
      *,
      company:company_id(company_name, status),
      assigned_user:assigned_to(first_name, last_name),
      contacted_user:contacted_by(first_name, last_name),
      created_user:created_by(first_name, last_name)
    `)
    .eq('is_deleted', false); // Only export non-deleted representatives

  // Apply the same filters as the main representatives page
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
    query = query.eq('is_exported', true);
  }
  if (filters.exported_filter === 'not_exported_only') {
    query = query.eq('is_exported', false);
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

  const { data, error } = await query;
  return { data, error };
};

export const parseCSV = (csvText) => {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  // Function to parse a CSV line respecting quoted fields
  const parseCsvLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Handle escaped quotes ("")
          current += '"';
          i += 2;
          continue;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Found a delimiter outside of quotes
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
      i++;
    }

    // Add the last field
    result.push(current.trim());
    return result;
  };

  // Parse headers
  const headers = parseCsvLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
  
  // Parse data rows
  const rows = lines.slice(1).map(line => {
    const values = parseCsvLine(line).map(v => v.replace(/^"|"$/g, ''));
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index] || '';
      return obj;
    }, {});
  });

  return { headers, rows };
};

export const getCSVTemplates = async (templateType) => {
  const { data, error } = await supabase
    .from('csv_templates')
    .select('*')
    .eq('template_type', templateType)
    .order('created_at', { ascending: false });

  return { data, error };
};

export const saveCSVTemplate = async (templateData, userId) => {
  const { data, error } = await supabase
    .from('csv_templates')
    .insert([{
      ...templateData,
      created_by: userId
    }])
    .select()
    .single();

  return { data, error };
};

export const deleteCSVTemplate = async (id) => {
  const { error } = await supabase
    .from('csv_templates')
    .delete()
    .eq('id', id);

  return { error };
};

export const importCompaniesFromCSV = async (mappedData, userId) => {
  // First, resolve assigned_to emails to user IDs
  const companies = await Promise.all(mappedData.map(async (row) => {
    const companyData = { ...row };
    
    // Validate and normalize status values
    if (row.status) {
      const validStatuses = [
        'No Status',
        'Declined',
        'Company Not a Fit',
        'In Progress',
        'Client',
        'Revisit Later',
        'No Reply'
      ];
      
      // Trim whitespace and check if the status is valid, if not set to null
      const trimmedStatus = row.status.trim();
      if (!validStatuses.includes(trimmedStatus)) {
        console.log('Invalid status found during import:', row.status, 'Setting to null');
        companyData.status = null;
      } else {
        companyData.status = trimmedStatus;
      }
    } else {
      companyData.status = null;
    }
    
    // Resolve assigned_to email to user ID
    if (row.assigned_to) {
      const { data: userData } = await supabase
        .from('users_role')
        .select('id')
        .eq('email', row.assigned_to)
        .single();
      
      companyData.assigned_to = userData?.id || null;
    }
    
    companyData.created_by = userId;
    companyData.updated_by = userId;
    companyData.mark_unread = true; // All imported companies are marked as unread
    
    return companyData;
  }));

  // Detect duplicates by company_name (case-insensitive exact match)
  const uniqueIncomingNames = [...new Set(
    companies
      .map(c => c.company_name?.trim())
      .filter(name => name && name.length > 0)
  )];

  const duplicateNameToExisting = new Map();
  for (const name of uniqueIncomingNames) {
    let { data: existing } = await supabase
      .from('companies')
      .select('id, company_name')
      .eq('is_deleted', false)
      .ilike('company_name', name)
      .maybeSingle();

    if (!existing) {
      const { data: exact } = await supabase
        .from('companies')
        .select('id, company_name')
        .eq('is_deleted', false)
        .eq('company_name', name)
        .maybeSingle();
      existing = exact;
    }

    if (existing) {
      duplicateNameToExisting.set(name, existing.company_name);
    }
  }

  const duplicates = [];
  for (const [importedName, existingName] of duplicateNameToExisting.entries()) {
    // Retrieve existing id again from map by querying once more or caching ids in the map
    // Adjust map to hold object with id and name; since we only stored name, re-query here
    let { data: existing } = await supabase
      .from('companies')
      .select('id, company_name')
      .eq('is_deleted', false)
      .ilike('company_name', importedName)
      .maybeSingle();
    if (!existing) {
      const { data: exact } = await supabase
        .from('companies')
        .select('id, company_name')
        .eq('is_deleted', false)
        .eq('company_name', importedName)
        .maybeSingle();
      existing = exact;
    }
    duplicates.push({ imported_name: importedName, existing_name: existingName, existing_id: existing?.id || null });
  }

  // Insert all rows (including duplicates); we are only reporting duplicates, not preventing insert
  const { data, error } = await supabase
    .from('companies')
    .insert(companies)
    .select();

  if (!error && data) {
    // Log import action
    await supabase
      .from('audit_logs')
      .insert([{
        user_id: userId,
        action: 'csv_import',
        table_name: 'companies',
        metadata: { 
          import_count: data.length,
          import_type: 'companies',
          skipped_duplicates: duplicates.length
        }
      }]);
  }

  return { data, error, duplicates };
};

// Update existing companies by matching on company_name.
// Only updates fields that have non-null and non-empty values in the CSV mapping.
// Rows whose company_name doesn't exist in DB are ignored.
export const modifyCompaniesFromCSV = async (mappedData, userId) => {
  // Collect unique company names from incoming data
  const uniqueCompanyNames = [...new Set(
    mappedData
      .map(row => row.company_name?.trim())
      .filter(name => name && name.length > 0)
  )];

  // Build a map company_name -> company_id by querying the DB
  const companyNameToIdMap = new Map();
  for (const companyName of uniqueCompanyNames) {
    // Prefer case-insensitive exact match
    let { data: companyData } = await supabase
      .from('companies')
      .select('id, company_name')
      .eq('is_deleted', false)
      .ilike('company_name', companyName)
      .maybeSingle();

    if (!companyData) {
      // Fallback to exact match in case ilike behaves unexpectedly
      const { data: exactMatch } = await supabase
        .from('companies')
        .select('id, company_name')
        .eq('is_deleted', false)
        .eq('company_name', companyName)
        .maybeSingle();
      companyData = exactMatch;
    }

    if (companyData) {
      companyNameToIdMap.set(companyName, companyData.id);
    }
  }

  const updatedRecords = [];
  for (const row of mappedData) {
    const name = row.company_name?.trim();
    if (!name) continue;

    const companyId = companyNameToIdMap.get(name);
    if (!companyId) continue; // Ignore non-existent

    // Build update payload: only include non-null/non-empty values, and never change company_name here
    const updatePayload = {};

    // Normalize status similar to import
    if (row.status) {
      const validStatuses = [
        'No Status',
        'Declined',
        'Company Not a Fit',
        'In Progress',
        'Client',
        'Revisit Later',
        'No Reply'
      ];
      const trimmedStatus = row.status.trim();
      if (validStatuses.includes(trimmedStatus)) {
        updatePayload.status = trimmedStatus;
      } else {
        // Skip invalid status updates
      }
    }

    // Resolve assigned_to email to user ID if present
    if (row.assigned_to) {
      const { data: userData } = await supabase
        .from('users_role')
        .select('id')
        .eq('email', row.assigned_to)
        .maybeSingle();
      if (userData?.id) {
        updatePayload.assigned_to = userData.id;
      }
    }

    // Copy over other simple fields if provided (non-null/non-empty)
    const candidateFields = [
      'industry',
      'location',
      'linkedin_url',
      'website',
      'source',
      'number_of_employees',
      'notes',
      'last_activity_date'
    ];

    for (const key of candidateFields) {
      const value = row[key];
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        updatePayload[key] = value;
      }
    }

    // If nothing to update, skip
    if (Object.keys(updatePayload).length === 0) {
      continue;
    }

    updatePayload.updated_by = userId;

    const { data: updated, error: updateError } = await supabase
      .from('companies')
      .update(updatePayload)
      .eq('id', companyId)
      .select();

    if (!updateError && updated && updated.length > 0) {
      updatedRecords.push(updated[0]);
    }
  }

  // Log modify import action
  if (updatedRecords.length > 0) {
    await supabase
      .from('audit_logs')
      .insert([{
        user_id: userId,
        action: 'csv_modify_import',
        table_name: 'companies',
        metadata: {
          modified_count: updatedRecords.length,
          import_type: 'companies'
        }
      }]);
  }

  return { data: updatedRecords, error: null };
};

export const importRepresentativesFromCSV = async (mappedData, userId) => {
  // First, get all unique company names from the import data
  const uniqueCompanyNames = [...new Set(
    mappedData
      .map(row => row.company_name?.trim())
      .filter(name => name && name.length > 0)
  )];

  // Create a map to store company name -> company ID mappings
  const companyNameToIdMap = new Map();

  // For each unique company name, check if it exists or create it
  for (const companyName of uniqueCompanyNames) {
    // First, try to find existing company (case-insensitive search)
    // Only consider companies that are not deleted
    let { data: companyData } = await supabase
      .from('companies')
      .select('id')
      .eq('is_deleted', false)
      .ilike('company_name', companyName)
      .maybeSingle();
    
    // If no match found, try exact case-insensitive match
    // Only consider companies that are not deleted
    if (!companyData) {
      const { data: exactMatch } = await supabase
        .from('companies')
        .select('id')
        .eq('is_deleted', false)
        .eq('company_name', companyName)
        .maybeSingle();
      companyData = exactMatch;
    }
    
    // If company doesn't exist, create it
    if (!companyData) {
      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert([{
          company_name: companyName,
          created_by: userId,
          updated_by: userId,
          mark_unread: true
        }])
        .select('id')
        .single();
      
      if (!createError && newCompany) {
        companyNameToIdMap.set(companyName, newCompany.id);
        
        // Log the company creation
        await supabase
          .from('audit_logs')
          .insert([{
            user_id: userId,
            action: 'create',
            table_name: 'companies',
            record_id: newCompany.id,
            old_values: null,
            new_values: {
              company_name: companyName,
              created_by: userId,
              updated_by: userId,
              mark_unread: true
            },
            metadata: { created_during_csv_import: true }
          }]);
      }
    }
    
    // Store the mapping
    if (companyData) {
      companyNameToIdMap.set(companyName, companyData.id);
    }
  }

  // Build reverse map id -> name as we go
  const companyIdToNameMap = new Map();
  for (const [name, id] of companyNameToIdMap.entries()) {
    companyIdToNameMap.set(id, name);
  }

  // Now process each representative using the company mappings
  const representatives = await Promise.all(mappedData.map(async (row) => {
    const repData = { ...row };
    
    // Resolve company_name to company_id
    if (row.company_name && row.company_name.trim()) {
      // Use the pre-resolved company ID from our map
      repData.company_id = companyNameToIdMap.get(row.company_name.trim()) || null;
      if (repData.company_id) {
        companyIdToNameMap.set(repData.company_id, row.company_name.trim());
      }
    } else {
      repData.company_id = null;
    }
    
    // Remove company_name from the data since it's not a database field
    delete repData.company_name;
    
    // Construct full_name from first_name and last_name for database compatibility
    if (row.first_name) {
      repData.full_name = `${row.first_name} ${row.last_name || ''}`.trim();
    }
    
    // Resolve assigned_to email to user ID
    if (row.assigned_to) {
      const { data: userData } = await supabase
        .from('users_role')
        .select('id')
        .eq('email', row.assigned_to)
        .single();
      
      repData.assigned_to = userData?.id || null;
    }
    
    // Resolve contacted_by email to user ID
    if (row.contacted_by) {
      const { data: userData } = await supabase
        .from('users_role')
        .select('id')
        .eq('email', row.contacted_by)
        .single();
      
      repData.contacted_by = userData?.id || null;
    }
    
    // Validate and normalize status values
    if (row.status) {
      const validStatuses = [
        'No Status',
        'No Reply', 
        'Not Interested',
        'Contacted',
        'Connected',
        'In Communication',
        'Not a Fit',
        'Asked to Reach Out Later',
        'Declined',
        'Client',
        'Pending Connection'
      ];
      
      // Trim whitespace and check if the status is valid (case-insensitive)
      const trimmedStatus = row.status.trim();
      const matchedStatus = validStatuses.find(validStatus => 
        validStatus.toLowerCase() === trimmedStatus.toLowerCase()
      );
      
      if (matchedStatus) {
        repData.status = matchedStatus;
      } else {
        console.log('Invalid status found during representative import:', row.status, 'Available options:', validStatuses, 'Setting to null');
        repData.status = null;
      }
    } else {
      repData.status = null;
    }
    
    // Convert contact_date to proper format
    if (row.contact_date) {
      repData.contact_date = new Date(row.contact_date).toISOString().split('T')[0];
    }
    
    repData.created_by = userId;
    repData.updated_by = userId;
    repData.mark_unread = true; // All imported representatives are marked as unread
    
    return repData;
  }));

  // Detect duplicates by (full_name, company_id) BEFORE inserting,
  // so we only capture matches against records that already existed.
  const duplicates = [];
  const uniquePairs = new Map(); // key: `${company_id}__${full_name.toLowerCase()}` -> { full_name, company_id }
  for (const rep of representatives) {
    const fullName = rep.full_name?.trim();
    const companyId = rep.company_id || null;
    if (!fullName || !companyId) continue;
    const key = `${companyId}__${fullName.toLowerCase()}`;
    if (!uniquePairs.has(key)) {
      uniquePairs.set(key, { full_name: fullName, company_id: companyId });
    }
  }

  for (const { full_name, company_id } of uniquePairs.values()) {
    // Require BOTH full_name and company_id to match an existing record
    let { data: existing } = await supabase
      .from('representatives')
      .select('id, full_name, company_id')
      .eq('is_deleted', false)
      .eq('company_id', company_id)
      .ilike('full_name', full_name)
      .maybeSingle();
    if (!existing) {
      const { data: exact } = await supabase
        .from('representatives')
        .select('id, full_name, company_id')
        .eq('is_deleted', false)
        .eq('company_id', company_id)
        .eq('full_name', full_name)
        .maybeSingle();
      existing = exact;
    }
    if (existing) {
      duplicates.push({
        existing_id: existing.id,
        existing_name: existing.full_name,
        existing_company_name: companyIdToNameMap.get(existing.company_id) || '',
        imported_name: full_name,
        imported_company_name: companyIdToNameMap.get(company_id) || ''
      });
    }
  }

  const { data, error } = await supabase
    .from('representatives')
    .insert(representatives)
    .select();

  if (!error && data) {
    // Log import action
    await supabase
      .from('audit_logs')
      .insert([{
        user_id: userId,
        action: 'csv_import',
        table_name: 'representatives',
        metadata: { 
          import_count: data.length,
          import_type: 'representatives',
          duplicates_found: duplicates.length
        }
      }]);
  }

  return { data, error, duplicates };
};

// Update existing representatives by matching on full_name and company_id.
// Only updates fields that have non-null and non-empty values in the CSV mapping.
// Rows whose company or representative doesn't exist are ignored.
export const modifyRepresentativesFromCSV = async (mappedData, userId) => {
  // Collect unique company names from incoming data to resolve to company IDs
  const uniqueCompanyNames = [...new Set(
    mappedData
      .map(row => row.company_name?.trim())
      .filter(name => name && name.length > 0)
  )];

  const companyNameToIdMap = new Map();
  for (const companyName of uniqueCompanyNames) {
    // Find existing company by case-insensitive match; do NOT create
    let { data: companyData } = await supabase
      .from('companies')
      .select('id')
      .eq('is_deleted', false)
      .ilike('company_name', companyName)
      .maybeSingle();
    if (!companyData) {
      const { data: exactMatch } = await supabase
        .from('companies')
        .select('id')
        .eq('is_deleted', false)
        .eq('company_name', companyName)
        .maybeSingle();
      companyData = exactMatch;
    }
    if (companyData) {
      companyNameToIdMap.set(companyName, companyData.id);
    }
  }

  const updatedRecords = [];
  for (const row of mappedData) {
    // Build full_name as per import behavior
    const fullName = `${row.first_name || ''} ${row.last_name || ''}`.trim();
    if (!fullName) continue;

    // Resolve company_id; if company_name not provided or not found, skip
    const companyName = row.company_name?.trim();
    if (!companyName) continue;
    const companyId = companyNameToIdMap.get(companyName);
    if (!companyId) continue;

    // Find representative by full_name + company_id
    let { data: repData } = await supabase
      .from('representatives')
      .select('id')
      .eq('is_deleted', false)
      .eq('company_id', companyId)
      .eq('full_name', fullName)
      .maybeSingle();

    // Fallback: case-insensitive match on full_name within the company
    if (!repData) {
      const { data: repLike } = await supabase
        .from('representatives')
        .select('id')
        .eq('is_deleted', false)
        .eq('company_id', companyId)
        .ilike('full_name', fullName)
        .maybeSingle();
      repData = repLike;
    }

    if (!repData?.id) continue; // No existing representative, ignore

    const updatePayload = {};

    // Optional: allow updating company association if a valid company_name provided
    // (In our matching we already used this company_id, so it is effectively unchanged.)

    // Normalize and update status if valid
    if (row.status) {
      const validStatuses = [
        'No Status',
        'No Reply',
        'Not Interested',
        'Contacted',
        'Connected',
        'In Communication',
        'Not a Fit',
        'Asked to Reach Out Later',
        'Declined',
        'Client',
        'Pending Connection'
      ];
      const trimmedStatus = row.status.trim();
      const matchedStatus = validStatuses.find(v => v.toLowerCase() === trimmedStatus.toLowerCase());
      if (matchedStatus) {
        updatePayload.status = matchedStatus;
      }
    }

    // Resolve assigned_to and contacted_by emails to user IDs
    if (row.assigned_to) {
      const { data: userData } = await supabase
        .from('users_role')
        .select('id')
        .eq('email', row.assigned_to)
        .maybeSingle();
      if (userData?.id) {
        updatePayload.assigned_to = userData.id;
      }
    }
    if (row.contacted_by) {
      const { data: userData } = await supabase
        .from('users_role')
        .select('id')
        .eq('email', row.contacted_by)
        .maybeSingle();
      if (userData?.id) {
        updatePayload.contacted_by = userData.id;
      }
    }

    // Copy simple fields if provided
    const simpleFields = [
      'first_name',
      'last_name',
      'role',
      'linkedin_profile_url',
      'method_of_contact',
      'contact_source',
      'outcome',
      'notes'
    ];
    for (const key of simpleFields) {
      const value = row[key];
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        updatePayload[key] = value;
      }
    }

    // Update contact_date if provided
    if (row.contact_date) {
      const dateVal = new Date(row.contact_date);
      if (!isNaN(dateVal.getTime())) {
        updatePayload.contact_date = dateVal.toISOString().split('T')[0];
      }
    }

    // Maintain full_name consistency if first/last updated
    if (updatePayload.first_name || updatePayload.last_name) {
      const newFirst = updatePayload.first_name ?? row.first_name ?? '';
      const newLast = updatePayload.last_name ?? row.last_name ?? '';
      const recomputed = `${newFirst} ${newLast}`.trim();
      if (recomputed) {
        updatePayload.full_name = recomputed;
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      continue; // nothing to update
    }

    updatePayload.updated_by = userId;

    const { data: updated, error: updateError } = await supabase
      .from('representatives')
      .update(updatePayload)
      .eq('id', repData.id)
      .select();

    if (!updateError && updated && updated.length > 0) {
      updatedRecords.push(updated[0]);
    }
  }

  // Log modify import action
  if (updatedRecords.length > 0) {
    await supabase
      .from('audit_logs')
      .insert([{
        user_id: userId,
        action: 'csv_modify_import',
        table_name: 'representatives',
        metadata: {
          modified_count: updatedRecords.length,
          import_type: 'representatives'
        }
      }]);
  }

  return { data: updatedRecords, error: null };
};

export const exportToCSV = async (data, fields, exportType, purpose, userId, filters = {}) => {
  // Mark representatives as exported for current user if exporting representatives
  if (exportType === 'representatives' && data.length > 0) {
    const representativeIds = data.map(rep => rep.id);
    
    // Insert user_exports records for current user (upsert to handle duplicates)
    const exportRecords = representativeIds.map(repId => ({
      user_id: userId,
      representative_id: repId
    }));
    
    // Use upsert to handle cases where user has already exported this representative
    await supabase
      .from('user_exports')
      .upsert(exportRecords, { 
        onConflict: 'user_id,representative_id'
      });
  }

  // Transform data to flatten nested objects for export
  const transformedData = data.map(row => {
    const transformed = { ...row };
    
    // Handle representatives export - flatten company data
    if (exportType === 'representatives' && row.company) {
      transformed.company_name = row.company.company_name || '';
      transformed.company_status = row.company.status || '';
      transformed.company_industry = row.company.industry || '';
      transformed.company_location = row.company.location || '';
    }
    
    // Handle user data flattening
    if (row.assigned_user) {
      transformed.assigned_to = `${row.assigned_user.first_name} ${row.assigned_user.last_name}`;
    }
    if (row.contacted_user) {
      transformed.contacted_by = `${row.contacted_user.first_name} ${row.contacted_user.last_name}`;
    }
    if (row.created_user) {
      transformed.created_by = `${row.created_user.first_name} ${row.created_user.last_name}`;
    }
    
    return transformed;
  });
  
  // Create CSV content
  const headers = fields.join(',');
  const rows = transformedData.map(row => 
    fields.map(field => {
      const value = row[field] || '';
      // Escape commas and quotes
      return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
        ? `"${value.replace(/"/g, '""')}"` 
        : value;
    }).join(',')
  );
  
  const csvContent = [headers, ...rows].join('\n');
  
  // Log export action
  await supabase
    .from('export_logs')
    .insert([{
      user_id: userId,
      export_type: exportType,
      purpose: purpose,
      fields_exported: fields,
      record_count: data.length,
      file_name: `${exportType}_export_${new Date().toISOString().split('T')[0]}.csv`
    }]);

  // Log audit
  await supabase
    .from('audit_logs')
    .insert([{
      user_id: userId,
      action: 'csv_export',
      table_name: exportType,
      metadata: { 
        export_count: data.length,
        export_type: exportType,
        purpose: purpose,
        fields: fields,
        filters_used: filters
      }
    }]);

  return csvContent;
};

export const downloadCSV = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};