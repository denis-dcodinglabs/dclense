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
      const method = rep.method_of_contact || 'No Method Specified';
      
      if (!methodStats[method]) {
        methodStats[method] = {
          method,
          leads_contacted: 0,
          responses: 0,
          conversions: 0
        };
      }

      // Count as lead contacted if status is different from "No Status"
      if (rep.status && rep.status !== 'No Status') {
        methodStats[method].leads_contacted++;
      }

      // Count as response if status is one of the specified response statuses
      const responseStatuses = ['Not Interested', 'Contacted', 'Not a Fit', 'Asked to Reach Out Later', 'Declined', 'Client'];
      if (responseStatuses.includes(rep.status)) {
        methodStats[method].responses++;
      }

      // Count as conversion if status is "Client"
      if (rep.status === 'Client') {
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
      `);

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