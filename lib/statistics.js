import { supabase } from './supabase';

export const getContactMethodStats = async (dateRange = '30') => {
  try {
    // Calculate date filter
    let dateFilter = null;
    if (dateRange !== 'all') {
      const days = parseInt(dateRange);
      const date = new Date();
      date.setDate(date.getDate() - days);
      dateFilter = date.toISOString();
    }

    // Get all representatives with contact data
    let query = supabase
      .from('representatives')
      .select('method_of_contact, status, outcome, contact_date, created_at');

    if (dateFilter) {
      query = query.gte('contact_date', dateFilter);
    }

    const { data: representatives, error } = await query;

    if (error) {
      console.error('Error fetching contact method stats:', error);
      return { data: null, error };
    }

    // Process data to calculate stats by contact method
    const methodStats = {};

    representatives.forEach(rep => {
      // Normalize method of contact by trimming and converting to lowercase for consistent counting
      const rawMethod = rep.method_of_contact || 'No Method Specified';
      const normalizedMethod = rawMethod.trim().toLowerCase();
      
      // Define proper capitalization for common methods
      const properCapitalization = {
        'linkedin': 'LinkedIn',
        'email': 'Email',
        'phone': 'Phone',
        'facebook': 'Facebook',
        'instagram': 'Instagram',
        'twitter': 'Twitter',
        'whatsapp': 'WhatsApp',
        'website': 'Website',
        'referral': 'Referral'
      };
      
      // Use proper capitalization if available, otherwise use the trimmed original
      const displayMethod = properCapitalization[normalizedMethod] || rawMethod.trim() || 'No Method Specified';
      
      if (!methodStats[normalizedMethod]) {
        methodStats[normalizedMethod] = {
          method: displayMethod,
          leads_contacted: 0,
          responses: 0,
          conversions: 0
        };
      }

      // Count as lead contacted if status is different from "No Status"
      if (rep.status && rep.status !== 'No Status') {
        methodStats[normalizedMethod].leads_contacted++;
      }

      // Count as response if status is one of the specified response statuses
      const responseStatuses = ['Not Interested', 'Contacted', 'Not a Fit', 'Asked to Reach Out Later', 'Declined', 'Client'];
      if (responseStatuses.includes(rep.status)) {
        methodStats[normalizedMethod].responses++;
      }

      // Count as conversion if status is "Client"
      if (rep.status === 'Client') {
        methodStats[normalizedMethod].conversions++;
      }
    });

    // Calculate rates and format data
    const formattedStats = Object.values(methodStats).map(stat => ({
      ...stat,
      response_rate: stat.leads_contacted > 0 ? (stat.responses / stat.leads_contacted * 100) : 0,
      conversion_rate: stat.leads_contacted > 0 ? (stat.conversions / stat.leads_contacted * 100) : 0
    }));

    return { data: formattedStats, error: null };
  } catch (err) {
    console.error('Unexpected error in getContactMethodStats:', err);
    return { data: null, error: err };
  }
};

export const getAgentStats = async (dateRange = '30', selectedAgent = 'all') => {
  try {
    // First get all users to ensure we have complete agent data
    const { data: allUsers, error: usersError } = await supabase
      .from('users_role')
      .select('id, first_name, last_name');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return { data: null, error: usersError };
    }

    // Calculate date filter
    let dateFilter = null;
    if (dateRange !== 'all') {
      const days = parseInt(dateRange);
      const date = new Date();
      date.setDate(date.getDate() - days);
      dateFilter = date.toISOString();
    }

    // Get representatives with agent data
    let query = supabase
      .from('representatives')
      .select(`
        *,
        contacted_user:contacted_by(first_name, last_name),
        assigned_user:assigned_to(first_name, last_name)
      `)
      .eq('is_deleted', false); // Only include non-deleted representatives

    if (dateFilter) {
      query = query.gte('contact_date', dateFilter);
    }

    const { data: representatives, error } = await query;

    if (error) {
      console.error('Error fetching agent stats:', error);
      return { data: null, error };
    }

    // Initialize stats for all users
    const agentStats = {};

    // Initialize all users with zero stats
    allUsers.forEach(user => {
      const agentName = `${user.first_name} ${user.last_name}`;
      agentStats[agentName] = {
        agent_name: agentName,
        leads_contacted: 0,
        responses: 0,
        conversions: 0,
        last_activity: null
      };
    });

    // Process representatives data
    representatives.forEach(rep => {
      // Use assigned_to user as the primary agent, fallback to contacted_by
      let agentName = null;
      
      if (rep.assigned_user) {
        agentName = `${rep.assigned_user.first_name} ${rep.assigned_user.last_name}`;
      } else if (rep.contacted_user) {
        agentName = `${rep.contacted_user.first_name} ${rep.contacted_user.last_name}`;
      }

      // Skip if no agent found
      if (!agentName) return;

      // Filter by selected agent if specified
      if (selectedAgent !== 'all' && agentName !== selectedAgent) {
        return;
      }

      // Ensure agent exists in stats (should already be initialized)
      if (!agentStats[agentName]) {
        agentStats[agentName] = {
          agent_name: agentName,
          leads_contacted: 0,
          responses: 0,
          conversions: 0,
          last_activity: null
        };
      }

      // Count as contacted if assigned to this agent
      if (rep.assigned_to || rep.contacted_by) {
        agentStats[agentName].leads_contacted++;
      }

      // Count as response if status indicates engagement
      const responseStatuses = ['Not Interested', 'Contacted', 'Not a Fit', 'Asked to Reach Out Later', 'Declined', 'Client'];
      if (responseStatuses.includes(rep.status)) {
        agentStats[agentName].responses++;
      }

      // Count as conversion if outcome indicates success
      if (rep.status === 'Client') {
        agentStats[agentName].conversions++;
      }

      // Track last activity
      const activityDate = rep.contact_date || rep.updated_at;
      if (activityDate && (!agentStats[agentName].last_activity || activityDate > agentStats[agentName].last_activity)) {
        agentStats[agentName].last_activity = activityDate;
      }
    });

    // Calculate rates and format data
    const formattedStats = Object.values(agentStats)
      .filter(stat => selectedAgent === 'all' || stat.agent_name === selectedAgent)
      .map(stat => ({
      ...stat,
      response_rate: stat.leads_contacted > 0 ? (stat.responses / stat.leads_contacted * 100) : 0,
      conversion_rate: stat.leads_contacted > 0 ? (stat.conversions / stat.leads_contacted * 100) : 0
    }))
      .sort((a, b) => b.leads_contacted - a.leads_contacted); // Sort by leads contacted descending

    return { data: formattedStats, error: null };
  } catch (err) {
    console.error('Unexpected error in getAgentStats:', err);
    return { data: null, error: err };
  }
};

export const getCreationStats = async (startDate, endDate) => {
  try {
    // Build date filters
    const filters = {};
    if (startDate) {
      filters.start = new Date(startDate).toISOString();
    }
    if (endDate) {
      // Add 23:59:59 to end date to include the entire day
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      filters.end = endDateTime.toISOString();
    }

    // Get representatives count
    let repQuery = supabase
      .from('representatives')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);

    if (filters.start) {
      repQuery = repQuery.gte('created_at', filters.start);
    }
    if (filters.end) {
      repQuery = repQuery.lte('created_at', filters.end);
    }

    // Get companies count
    let companyQuery = supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);

    if (filters.start) {
      companyQuery = companyQuery.gte('created_at', filters.start);
    }
    if (filters.end) {
      companyQuery = companyQuery.lte('created_at', filters.end);
    }

    const [repResult, companyResult] = await Promise.all([
      repQuery,
      companyQuery
    ]);

    if (repResult.error) {
      console.error('Error fetching representatives creation stats:', repResult.error);
      return { data: null, error: repResult.error };
    }

    if (companyResult.error) {
      console.error('Error fetching companies creation stats:', companyResult.error);
      return { data: null, error: companyResult.error };
    }

    return {
      data: {
        representatives_count: repResult.count || 0,
        companies_count: companyResult.count || 0,
        start_date: startDate,
        end_date: endDate
      },
      error: null
    };
  } catch (err) {
    console.error('Unexpected error in getCreationStats:', err);
    return { data: null, error: err };
  }
};

export const getContactedStats = async (startDate, endDate) => {
  try {
    // Build date filters
    const filters = {};
    if (startDate) {
      filters.start = new Date(startDate).toISOString().split('T')[0]; // Get YYYY-MM-DD format
    }
    if (endDate) {
      filters.end = new Date(endDate).toISOString().split('T')[0]; // Get YYYY-MM-DD format
    }

    // Get all representatives and filter client-side for follow_up_dates array
    let repQuery = supabase
      .from('representatives')
      .select('id, contact_date, follow_up_dates, company_id')
      .eq('is_deleted', false);

    const { data: representatives, error: repError } = await repQuery;

    if (repError) {
      console.error('Error fetching representatives for contacted/follow-up stats:', repError);
      return { data: null, error: repError };
    }

    // Filter representatives client-side
    const filteredReps = representatives.filter(rep => {
      // Check contact_date
      let hasContactInRange = false;
      if (rep.contact_date) {
        const contactDate = new Date(rep.contact_date).toISOString().split('T')[0];
        if (filters.start && filters.end) {
          hasContactInRange = contactDate >= filters.start && contactDate <= filters.end;
        } else if (filters.start) {
          hasContactInRange = contactDate >= filters.start;
        } else if (filters.end) {
          hasContactInRange = contactDate <= filters.end;
        }
      }

      // Check follow_up_dates array
      let hasFollowUpInRange = false;
      if (rep.follow_up_dates && Array.isArray(rep.follow_up_dates)) {
        hasFollowUpInRange = rep.follow_up_dates.some(followUpDate => {
          if (!followUpDate) return false;
          
          const followUpDateStr = new Date(followUpDate).toISOString().split('T')[0];
          if (filters.start && filters.end) {
            return followUpDateStr >= filters.start && followUpDateStr <= filters.end;
          } else if (filters.start) {
            return followUpDateStr >= filters.start;
          } else if (filters.end) {
            return followUpDateStr <= filters.end;
          }
          return false;
        });
      }

      return hasContactInRange || hasFollowUpInRange;
    });

    // Count unique companies from filtered representatives
    const uniqueCompanyIds = new Set();
    filteredReps.forEach(rep => {
      if (rep.company_id) {
        uniqueCompanyIds.add(rep.company_id);
      }
    });

    return {
      data: {
        representatives_contacted: filteredReps.length,
        companies_contacted: uniqueCompanyIds.size,
        start_date: startDate,
        end_date: endDate
      },
      error: null
    };
  } catch (err) {
    console.error('Unexpected error in getContactedStats:', err);
    return { data: null, error: err };
  }
};