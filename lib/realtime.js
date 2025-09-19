import { supabase } from './supabase';
import { doesRepresentativeMatchFilters } from '@/app/candidates/candidatesHelpers';

// Real-time subscription for representatives
export const subscribeToRepresentatives = (callback) => {
  const subscription = supabase
    .channel('representatives_changes')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'representatives'
      },
      (payload) => {
        console.log('Representatives change received:', payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('Representatives subscription status:', status);
      if (status === 'CHANNEL_ERROR') {
        console.error('Failed to subscribe to representatives changes');
      }
    });

  return subscription;
};

// Real-time subscription for companies
export const subscribeToCompanies = (callback) => {
  const subscription = supabase
    .channel('companies_changes')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'companies'
      },
      (payload) => {
        console.log('Companies change received:', payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('Companies subscription status:', status);
      if (status === 'CHANNEL_ERROR') {
        console.error('Failed to subscribe to companies changes');
      }
    });

  return subscription;
};

// Helper function to handle real-time updates for representatives
export const handleRepresentativeUpdate = (payload, currentData, setData, filters = {}) => {
  const { eventType, new: newRecord, old: oldRecord } = payload;
  const a_filter_is_active = Object.values(filters).some(value => {
    if (Array.isArray(value)) return value.length > 0;
    return !!value;
  });


  switch (eventType) {
    case 'INSERT':
      if (!a_filter_is_active || doesRepresentativeMatchFilters(newRecord, filters)) {
        setData(prev => [newRecord, ...prev]);
      }
      break;
    
    case 'UPDATE':
      const matchesFilters = doesRepresentativeMatchFilters(newRecord, filters);
      const wasInList = currentData.some(item => item.id === newRecord.id);

      if (matchesFilters) {
        if (wasInList) {
          // Update in place
          setData(prev => prev.map(item => 
            item.id === newRecord.id ? { ...item, ...newRecord } : item
          ));
        } else {
          // Add to list
          setData(prev => [newRecord, ...prev]);
        }
      } else {
        // No longer matches, remove if it was in the list
        if (wasInList) {
          setData(prev => prev.filter(item => item.id !== newRecord.id));
        }
      }
      break;
    
    case 'DELETE':
      // Remove deleted representative if it exists in the current data
      setData(prev => prev.filter(item => item.id !== oldRecord.id));
      break;
    
    default:
      console.log('Unknown event type:', eventType);
  }
};

// Helper function to handle real-time updates for companies
export const handleCompanyUpdate = (payload, currentData, setData, filters = {}, filterMatcher) => {
  const { eventType, new: newRecord, old: oldRecord } = payload;
  const a_filter_is_active = Object.values(filters).some(value => {
    if (Array.isArray(value)) return value.length > 0;
    return !!value;
  });

  switch (eventType) {
    case 'INSERT':
      if (!a_filter_is_active || filterMatcher(newRecord, filters)) {
        setData(prev => [newRecord, ...prev]);
      }
      break;
    
    case 'UPDATE':
      const matchesFilters = filterMatcher(newRecord, filters);
      const wasInList = currentData.some(item => item.id === newRecord.id);

      if (matchesFilters) {
        if (wasInList) {
          setData(prev => prev.map(item => 
            item.id === newRecord.id ? { ...item, ...newRecord } : item
          ));
        } else {
          setData(prev => [newRecord, ...prev]);
        }
      } else {
        if (wasInList) {
          setData(prev => prev.filter(item => item.id !== newRecord.id));
        }
      }
      break;
    
    case 'DELETE':
      setData(prev => prev.filter(item => item.id !== oldRecord.id));
      break;
    
    default:
      console.log('Unknown event type:', eventType);
  }
};


// Cleanup function to unsubscribe from channels
export const unsubscribeFromChannel = (subscription) => {
  if (subscription) {
    supabase.removeChannel(subscription);
  }
};