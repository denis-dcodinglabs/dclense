import { supabase } from './supabase';

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
    });

  return subscription;
};

// Helper function to handle real-time updates for representatives
export const handleRepresentativeUpdate = (payload, currentData, setData) => {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  switch (eventType) {
    case 'INSERT':
      // Add new representative to the list
      setData(prev => [newRecord, ...prev]);
      break;
    
    case 'UPDATE':
      // Update existing representative
      setData(prev => prev.map(item => 
        item.id === newRecord.id ? { ...item, ...newRecord } : item
      ));
      break;
    
    case 'DELETE':
      // Remove deleted representative
      setData(prev => prev.filter(item => item.id !== oldRecord.id));
      break;
    
    default:
      console.log('Unknown event type:', eventType);
  }
};

// Helper function to handle real-time updates for companies
export const handleCompanyUpdate = (payload, currentData, setData) => {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  switch (eventType) {
    case 'INSERT':
      // Add new company to the list
      setData(prev => [newRecord, ...prev]);
      break;
    
    case 'UPDATE':
      // Update existing company
      setData(prev => prev.map(item => 
        item.id === newRecord.id ? { ...item, ...newRecord } : item
      ));
      break;
    
    case 'DELETE':
      // Remove deleted company
      setData(prev => prev.filter(item => item.id !== oldRecord.id));
      break;
    
    default:
      console.log('Unknown event type:', eventType);
  }
};

// Cleanup function to unsubscribe from channels
export const unsubscribeFromChannel = (subscription) => {
  if (subscription) {
    subscription.unsubscribe();
  }
};