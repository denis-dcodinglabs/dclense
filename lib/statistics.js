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
      .select('contact_source, status, outcome, contact_date, created_at');

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
      const method = rep.contact_source || 'Unknown';
      
      if (!methodStats[method]) {
        methodStats[method] = {
          method,
          leads_contacted: 0,
          responses: 0,
          conversions: 0
        };
      }

      // Count as contacted if there's a contact_date or if status indicates contact
      if (rep.contact_date || rep.status) {
        methodStats[method].leads_contacted++;
      }

      // Count as response if status indicates engagement
      const responseStatuses = ['Contacted', 'Interested', 'Not Interested', 'Asked to Reach Out Later'];
      if (responseStatuses.includes(rep.status)) {
        methodStats[method].responses++;
      }

      // Count as conversion if outcome indicates success
      const conversionOutcomes = ['Client', 'Converted'];
      if (conversionOutcomes.includes(rep.outcome) || rep.status === 'Client') {
        methodStats[method].conversions++;
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
      `);

    if (dateFilter) {
      query = query.gte('contact_date', dateFilter);
    }

    const { data: representatives, error } = await query;

    if (error) {
      console.error('Error fetching agent stats:', error);
      return { data: null, error };
    }

    // Process data to calculate stats by agent
    const agentStats = {};

    representatives.forEach(rep => {
      // Use contacted_by user as the primary agent, fallback to assigned_to
      let agentName = 'Unassigned';
      
      if (rep.contacted_user) {
        agentName = `${rep.contacted_user.first_name} ${rep.contacted_user.last_name}`;
      } else if (rep.assigned_user) {
        agentName = `${rep.assigned_user.first_name} ${rep.assigned_user.last_name}`;
      }

      // Filter by selected agent if specified
      if (selectedAgent !== 'all' && agentName !== selectedAgent) {
        return;
      }

      if (!agentStats[agentName]) {
        agentStats[agentName] = {
          agent_name: agentName,
          leads_contacted: 0,
          responses: 0,
          conversions: 0,
          last_activity: null
        };
      }

      // Count as contacted if there's a contact_date or if status indicates contact
      if (rep.contact_date || rep.status) {
        agentStats[agentName].leads_contacted++;
      }

      // Count as response if status indicates engagement
      const responseStatuses = ['Contacted', 'Interested', 'Not Interested', 'Asked to Reach Out Later'];
      if (responseStatuses.includes(rep.status)) {
        agentStats[agentName].responses++;
      }

      // Count as conversion if outcome indicates success
      const conversionOutcomes = ['Client', 'Converted'];
      if (conversionOutcomes.includes(rep.outcome) || rep.status === 'Client') {
        agentStats[agentName].conversions++;
      }

      // Track last activity
      const activityDate = rep.contact_date || rep.updated_at;
      if (activityDate && (!agentStats[agentName].last_activity || activityDate > agentStats[agentName].last_activity)) {
        agentStats[agentName].last_activity = activityDate;
      }
    });

    // Calculate rates and format data
    const formattedStats = Object.values(agentStats).map(stat => ({
      ...stat,
      response_rate: stat.leads_contacted > 0 ? (stat.responses / stat.leads_contacted * 100) : 0,
      conversion_rate: stat.leads_contacted > 0 ? (stat.conversions / stat.leads_contacted * 100) : 0
    }));

    return { data: formattedStats, error: null };
  } catch (err) {
    console.error('Unexpected error in getAgentStats:', err);
    return { data: null, error: err };
  }
};