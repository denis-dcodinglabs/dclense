import { supabase } from './supabase';

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
    
    // Normalize status values to match database constraints
    if (companyData.status) {
      // Handle em dash vs hyphen differences
      companyData.status = companyData.status.replace(/–/g, '-');
      
      // Map any other status variations if needed
      const statusMappings = {
        'Not Now – Revisit Later': 'Not Now - Revisit Later',
        'Not Now — Revisit Later': 'Not Now - Revisit Later',
        'Not Now — Revisit Later': 'Not Now - Revisit Later'
      };
      
      if (statusMappings[companyData.status]) {
        companyData.status = statusMappings[companyData.status];
      }
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
          import_type: 'companies'
        }
      }]);
  }

  return { data, error };
};

export const importRepresentativesFromCSV = async (mappedData, userId) => {
  // First, resolve company_name to company_id, assigned_to, and contacted_by emails to IDs
  const representatives = await Promise.all(mappedData.map(async (row) => {
    const repData = { ...row };
    
    // Resolve company_name to company_id
    if (row.company_name && row.company_name.trim()) {
      let { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .ilike('company_name', row.company_name.trim())
        .maybeSingle();
      
      // If company doesn't exist, create it
      if (!companyData) {
        const { data: newCompany, error: createError } = await supabase
          .from('companies')
          .insert([{
            company_name: row.company_name.trim(),
            created_by: userId,
            updated_by: userId,
            mark_unread: true
          }])
          .select('id')
          .single();
        
        if (!createError && newCompany) {
          companyData = newCompany;
          
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
                company_name: row.company_name.trim(),
                created_by: userId,
                updated_by: userId,
                mark_unread: true
              },
              metadata: { created_during_csv_import: true }
            }]);
        }
      }
      
      repData.company_id = companyData?.id || null;
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
    
    // Convert contact_date to proper format
    if (row.contact_date) {
      repData.contact_date = new Date(row.contact_date).toISOString().split('T')[0];
    }
    
    repData.created_by = userId;
    repData.updated_by = userId;
    repData.mark_unread = true; // All imported representatives are marked as unread
    
    return repData;
  }));

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
          import_type: 'representatives'
        }
      }]);
  }

  return { data, error };
};

export const exportToCSV = async (data, fields, exportType, purpose, userId) => {
  // Mark representatives as exported if exporting representatives
  if (exportType === 'representatives' && data.length > 0) {
    const representativeIds = data.map(rep => rep.id);
    await supabase
      .from('representatives')
      .update({ is_exported: true })
      .in('id', representativeIds);
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
        fields: fields
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