import { supabase } from './supabase';

export const checkUserInRole = async (email) => {
  // Use service role key for this check to bypass RLS
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data, error } = await supabaseAdmin
    .from('users_role')
    .select('id, email, role')
    .eq('email', email)
    .maybeSingle(); // Use maybeSingle() instead of single() to avoid error when no rows found
  
  console.log('Checking user role for:', email);
  console.log('Query result:', { data, error });
  
  return { data, error };
};


export const signUp = async (email, password) => {
  // First check if user exists in users_role table
  const { data: roleData, error: roleError } = await checkUserInRole(email);
  
  console.log('SignUp - Role check result:', { roleData, roleError });
  
  if (roleError && roleError.code !== 'PGRST116') {
    // PGRST116 is "not found" error, which we handle below
    console.error('Database error during role check:', roleError);
    return { 
      data: null, 
      error: { message: 'Database error occurred. Please try again.' }
    };
  }
  
  if (!roleData) {
    return { 
      data: null, 
      error: { message: 'This email is not authorized to create an account. Please contact your administrator.' }
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signIn = async (email, password) => {
  // First check if user exists in users_role table
  const { data: roleData, error: roleError } = await checkUserInRole(email);
  
  console.log('SignIn - Role check result:', { roleData, roleError });
  
  if (roleError && roleError.code !== 'PGRST116') {
    // PGRST116 is "not found" error, which we handle below
    console.error('Database error during role check:', roleError);
    return { 
      data: null, 
      error: { message: 'Database error occurred. Please try again.' }
    };
  }
  
  if (!roleData) {
    return { 
      data: null, 
      error: { message: 'This email is not authorized to sign in. Please contact your administrator.' }
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const resetPassword = async (email) => {
  // First check if user exists in users_role table
  const { data: roleData, error: roleError } = await checkUserInRole(email);
  
  console.log('Reset password - Role check result:', { roleData, roleError });
  
  if (roleError && roleError.code !== 'PGRST116') {
    console.error('Database error during role check:', roleError);
    return { 
      data: null, 
      error: { message: 'Database error occurred. Please try again.' }
    };
  }
  
  if (!roleData) {
    return { 
      data: null, 
      error: { message: 'This email is not found in our system. Please contact your administrator.' }
    };
  }

  // Use environment variable for base URL, fallback to window.location.origin
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/reset-password`,
  });
  
  return { data, error };
};

export const updatePassword = async (newPassword) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });
  
  return { data, error };
};

export const getCurrentUserWithRole = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get user role from users_role table
  const { data: roleData, error } = await supabase
    .from('users_role')
    .select('id, email, role, first_name, last_name')
    .eq('email', user.email)
    .single();

  if (error || !roleData) {
    console.error('Error fetching user role:', error);
    return null;
  }

  return {
    ...user,
    id: roleData.id, // Use users_role.id instead of auth.users.id for foreign key references
    role: roleData.role,
    first_name: roleData.first_name,
    last_name: roleData.last_name
  };
};