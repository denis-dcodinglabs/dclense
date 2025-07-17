import { supabase } from './supabase';

export const createUser = async (userData) => {
  const { data, error } = await supabase
    .from('users_role')
    .insert([userData])
    .select();
  return { data, error };
};

export const getUsers = async () => {
  const { data, error } = await supabase
    .from('users_role')
    .select('*')
    .order('created_at', { ascending: false });
  return { data, error };
};

export const updateUser = async (id, userData) => {
  const { data, error } = await supabase
    .from('users_role')
    .update(userData)
    .eq('id', id)
    .select();
  return { data, error };
};

export const deleteUser = async (id) => {
  const { error } = await supabase
    .from('users_role')
    .delete()
    .eq('id', id);
  return { error };
};