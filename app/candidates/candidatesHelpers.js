import { supabase } from '../../lib/supabase';

/**
 * Upload CV file to Supabase storage via API route
 * @param {File} cvFile - The CV file to upload
 * @returns {Promise<string|null>} - Returns the file path if successful, null if no file
 */
export const uploadCV = async (cvFile) => {
  if (!cvFile) return null;
  
  try {
    const formData = new FormData();
    formData.append('cv', cvFile);
    
    const response = await fetch('/api/candidates/upload-cv', {
      method: 'POST',
      body: formData,
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Upload failed');
    }
    
    return result.filePath;
  } catch (error) {
    console.error('Error uploading CV:', error);
    throw error;
  }
};

/**
 * Get public URL for CV file
 * @param {string} filePath - The file path from storage
 * @returns {string} - Public URL for the file
 */
export const getCVPublicUrl = (filePath) => {
  if (!filePath) return null;
  
  const { data } = supabase.storage
    .from('cv')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
};

/**
 * Save candidate data to Supabase via API route
 * @param {Object} candidateData - The candidate data to save
 * @param {string|null} cvUrl - The CV file URL (optional)
 * @returns {Promise<Object>} - Returns the saved candidate data
 */
export const saveCandidate = async (candidateData, cvUrl = null) => {
  try {
    // Prepare the data for insertion
    const dataToInsert = {
      ...candidateData,
      cv_url: cvUrl,
    };
    
    const response = await fetch('/api/candidates/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataToInsert),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to save candidate');
    }
    
    return result.candidate;
  } catch (error) {
    console.error('Error saving candidate:', error);
    throw error;
  }
};

/**
 * Save candidate with CV upload
 * @param {Object} candidateData - The candidate data including cv file
 * @returns {Promise<Object>} - Returns the saved candidate data
 */
export const saveCandidateWithCV = async (candidateData) => {
  try {
    let cvUrl = null;
    
    // Upload CV if provided
    if (candidateData.cv) {
      cvUrl = await uploadCV(candidateData.cv);
    }
    
    // Save candidate data
    const savedCandidate = await saveCandidate(candidateData, cvUrl);
    
    return savedCandidate;
  } catch (error) {
    console.error('Error saving candidate with CV:', error);
    throw error;
  }
};

/**
 * Get all candidates from Supabase
 * @returns {Promise<Array>} - Returns array of candidates
 */
export const getCandidates = async () => {
  try {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch candidates: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching candidates:', error);
    throw error;
  }
};

/**
 * Get candidate by ID
 * @param {string} id - The candidate ID
 * @returns {Promise<Object>} - Returns the candidate data
 */
export const getCandidateById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      throw new Error(`Failed to fetch candidate: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching candidate:', error);
    throw error;
  }
};

/**
 * Update candidate data
 * @param {string} id - The candidate ID
 * @param {Object} updates - The data to update
 * @returns {Promise<Object>} - Returns the updated candidate data
 */
export const updateCandidate = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('candidates')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) {
      throw new Error(`Failed to update candidate: ${error.message}`);
    }
    
    return data[0];
  } catch (error) {
    console.error('Error updating candidate:', error);
    throw error;
  }
};

/**
 * Delete candidate and their CV file from storage
 * @param {string} id - The candidate ID
 * @returns {Promise<void>}
 */
export const deleteCandidate = async (id) => {
  try {
    const response = await fetch('/api/candidates/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete candidate');
    }
  } catch (error) {
    console.error('Error deleting candidate:', error);
    throw error;
  }
};

/**
 * Remove candidate CV (deletes from storage and nulls cv_url)
 * @param {string} id - The candidate ID
 * @returns {Promise<object>} - Updated candidate
 */
export const removeCandidateCV = async (id) => {
  try {
    const response = await fetch('/api/candidates/delete-cv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to remove CV');
    }
    return result.candidate;
  } catch (error) {
    console.error('Error removing candidate CV:', error);
    throw error;
  }
};

export function doesRepresentativeMatchFilters(rep, filters) {
  if (!rep) return false;

  const {
    search,
    company_ids,
    assigned_to,
    status,
    contacted_by,
    rep_position,
    unread_filter,
  } = filters;

  // Search filter (name, company name, role)
  if (search) {
    const searchTerm = search.toLowerCase();
    const fullName = `${rep.first_name || ''} ${rep.last_name || ''}`.toLowerCase();
    const companyName = rep.company?.company_name?.toLowerCase() || '';
    const role = rep.role?.toLowerCase() || '';
    if (
      !fullName.includes(searchTerm) &&
      !companyName.includes(searchTerm) &&
      !role.includes(searchTerm)
    ) {
      return false;
    }
  }

  // Company filter
  if (company_ids && company_ids.length > 0) {
    if (!rep.company_id || !company_ids.includes(rep.company_id)) {
      return false;
    }
  }

  // Assignee filter
  if (assigned_to) {
    if (assigned_to === 'unassigned') {
      if (rep.assigned_to) return false;
    } else if (rep.assigned_to !== assigned_to) {
      return false;
    }
  }

  // Status filter
  if (status && status !== 'all') {
    if (status === 'No Status') {
      if (rep.status) return false;
    } else if (rep.status !== status) {
      return false;
    }
  }

  // Contacted by filter
  if (contacted_by && contacted_by.length > 0) {
    if (!rep.contacted_by || !contacted_by.includes(rep.contacted_by)) {
      return false;
    }
  }

  // Unread filter is handled by the initial fetch and cannot be reliably checked on client-side real-time updates without user-specific context.
  // rep_position is also excluded as it likely depends on ordering and relations not available in the realtime payload.

  return true;
}
