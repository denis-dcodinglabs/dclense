import { supabase } from './supabase';

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

export const deleteCSVTemplate = async (templateId) => {
  const { error } = await supabase
    .from('csv_templates')
    .delete()
    .eq('id', templateId);
  
  return { error };
};

export const parseCSV = (csvText) => {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) throw new Error('Empty CSV file');
  
  const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(value => value.trim().replace(/"/g, ''));
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }
  
  return { headers, rows };
};

export const exportToCSV = async (data, selectedFields, exportType, purpose, userId) => {
  // Log the export action
  await supabase
    .from('audit_logs')
    .insert([{
      user_id: userId,
      action: 'csv_export',
      table_name: exportType,
      metadata: {
        purpose,
        fields_exported: selectedFields,
        record_count: data.length
      }
    }]);
  
  // Generate CSV headers
  const headers = selectedFields.join(',');
  
  // Generate CSV rows
  const rows = data.map(item => {
    return selectedFields.map(field => {
      let value = item[field];
      
      // Handle special field formatting
      if (field === 'assigned_to' && item.assigned_user) {
        value = `${item.assigned_user.first_name} ${item.assigned_user.last_name}`;
      } else if (field === 'contacted_by' && item.contacted_user) {
        value = `${item.contacted_user.first_name} ${item.contacted_user.last_name}`;
      } else if (field === 'company_name' && item.company) {
        value = item.company.company_name;
      }
      
      // Escape commas and quotes in values
      if (value && typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      
      return value || '';
    }).join(',');
  });
  
  return `${headers}\n${rows.join('\n')}`;
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

export const importCompaniesFromCSV = async (mappedData, userId) => {
  const { data, error } = await supabase
    .from('companies')
    .insert(mappedData.map(item => ({
      ...item,
      created_by: userId,
      updated_by: userId
    })))
    .select();
  
  if (!error && data) {
    // Log the import action
    await supabase
      .from('audit_logs')
      .insert([{
        user_id: userId,
        action: 'csv_import',
        table_name: 'companies',
        metadata: {
          record_count: data.length,
          import_type: 'companies'
        }
      }]);
  }
  
  return { data, error };
};

export const importRepresentativesFromCSV = async (mappedData, userId) => {
  const { data, error } = await supabase
    .from('representatives')
    .insert(mappedData.map(item => ({
      ...item,
      full_name: `${item.first_name || ''} ${item.last_name || ''}`.trim(),
      created_by: userId,
      updated_by: userId
    })))
    .select();
  
  if (!error && data) {
    // Log the import action
    await supabase
      .from('audit_logs')
      .insert([{
        user_id: userId,
        action: 'csv_import',
        table_name: 'representatives',
        metadata: {
          record_count: data.length,
          import_type: 'representatives'
        }
      }]);
  }
  
  return { data, error };
};