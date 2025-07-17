import { supabase } from './supabase';

export const getCompanyStatusStats = async () => {
  const { data, error } = await supabase
    .from('companies')
    .select('status')
    .not('status', 'is', null);

  if (error) return { data: null, error };

  const stats = data.reduce((acc, company) => {
    acc[company.status] = (acc[company.status] || 0) + 1;
    return acc;
  }, {});

  return { data: stats, error: null };
};

export const getConversionRates = async () => {
  const { data: companies, error } = await supabase
    .from('companies')
    .select('status, source');

  if (error) return { data: null, error };

  const totalBySource = {};
  const clientsBySource = {};

  companies.forEach(company => {
    const source = company.source || 'Unknown';
    totalBySource[source] = (totalBySource[source] || 0) + 1;
    
    if (company.status === 'Client') {
      clientsBySource[source] = (clientsBySource[source] || 0) + 1;
    }
  });

  const conversionRates = Object.keys(totalBySource).map(source => ({
    source,
    total: totalBySource[source],
    clients: clientsBySource[source] || 0,
    rate: totalBySource[source] > 0 ? ((clientsBySource[source] || 0) / totalBySource[source] * 100).toFixed(1) : '0.0'
  }));

  return { data: conversionRates, error: null };
};

export const getAgentPerformance = async () => {
  const { data: representatives, error } = await supabase
    .from('representatives')
    .select(`
      contacted_by,
      outcome,
      contacted_user:contacted_by(first_name, last_name)
    `)
    .not('contacted_by', 'is', null);

  if (error) return { data: null, error };

  const performance = {};

  representatives.forEach(rep => {
    const agentId = rep.contacted_by;
    const agentName = rep.contacted_user ? 
      `${rep.contacted_user.first_name} ${rep.contacted_user.last_name}` : 
      'Unknown';

    if (!performance[agentId]) {
      performance[agentId] = {
        name: agentName,
        contacted: 0,
        converted: 0
      };
    }

    performance[agentId].contacted += 1;
    
    if (rep.outcome === 'Converted' || rep.outcome === 'Client') {
      performance[agentId].converted += 1;
    }
  });

  const performanceArray = Object.values(performance).map(agent => ({
    ...agent,
    conversionRate: agent.contacted > 0 ? ((agent.converted / agent.contacted) * 100).toFixed(1) : '0.0'
  }));

  return { data: performanceArray, error: null };
};

export const getActivityStats = async () => {
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('created_at, status');

  const { data: representatives, error: repsError } = await supabase
    .from('representatives')
    .select('created_at, contact_date');

  if (companiesError || repsError) {
    return { data: null, error: companiesError || repsError };
  }

  // Get last 30 days activity
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentCompanies = companies.filter(c => 
    new Date(c.created_at) >= thirtyDaysAgo
  );

  const recentContacts = representatives.filter(r => 
    r.contact_date && new Date(r.contact_date) >= thirtyDaysAgo
  );

  return {
    data: {
      totalCompanies: companies.length,
      recentCompanies: recentCompanies.length,
      totalRepresentatives: representatives.length,
      recentContacts: recentContacts.length,
      clientCount: companies.filter(c => c.status === 'Client').length
    },
    error: null
  };
};