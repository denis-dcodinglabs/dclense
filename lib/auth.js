import { supabase, getSupabaseClient } from "./supabase";

export const checkUserInRole = async (email) => {
  // Call server-side endpoint that uses service role
  const res = await fetch("/api/auth/check-role", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    return { data: null, error: { message: "Failed to check role" } };
  }
  const json = await res.json();
  return { data: json.data || null, error: null };
};

export const signUp = async (email, password) => {
  // First check if user exists in users_role table
  const { data: roleData, error: roleError } = await checkUserInRole(email);

  console.log("SignUp - Role check result:", { roleData, roleError });

  if (roleError && roleError.code !== "PGRST116") {
    // PGRST116 is "not found" error, which we handle below
    console.error("Database error during role check:", roleError);
    return {
      data: null,
      error: { message: "Database error occurred. Please try again." },
    };
  }

  if (!roleData) {
    return {
      data: null,
      error: {
        message:
          "This email is not authorized to create an account. Please contact your administrator.",
      },
    };
  }

  const client = getSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signIn = async (email, password) => {
  // First check if user exists in users_role table
  const { data: roleData, error: roleError } = await checkUserInRole(email);

  console.log("SignIn - Role check result:", { roleData, roleError });

  if (roleError && roleError.code !== "PGRST116") {
    // PGRST116 is "not found" error, which we handle below
    console.error("Database error during role check:", roleError);
    return {
      data: null,
      error: { message: "Database error occurred. Please try again." },
    };
  }

  if (!roleData) {
    return {
      data: null,
      error: {
        message:
          "This email is not authorized to sign in. Please contact your administrator.",
      },
    };
  }

  const client = getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const client = getSupabaseClient();
  const { error } = await client.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const client = getSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  return user;
};

export const resetPassword = async (email) => {
  // First check if user exists in users_role table
  const { data: roleData, error: roleError } = await checkUserInRole(email);

  console.log("Reset password - Role check result:", { roleData, roleError });

  if (roleError && roleError.code !== "PGRST116") {
    console.error("Database error during role check:", roleError);
    return {
      data: null,
      error: { message: "Database error occurred. Please try again." },
    };
  }

  if (!roleData) {
    return {
      data: null,
      error: {
        message:
          "This email is not found in our system. Please contact your administrator.",
      },
    };
  }

  // Use environment variable for production URL, fallback to current origin for development
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "https://dclense1.vercel.app");
  console.log("Reset password - baseUrl being used:", baseUrl);
  const client = getSupabaseClient();
  const { data, error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/reset-password`,
  });

  return { data, error };
};

export const updatePassword = async (newPassword) => {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.updateUser({
    password: newPassword,
  });

  return { data, error };
};

export const getCurrentUserWithRole = async () => {
  const client = getSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;

  // Get user role from users_role table
  const { data: roleData, error } = await client
    .from("users_role")
    .select("id, email, role, first_name, last_name")
    .eq("email", user.email)
    .single();

  if (error || !roleData) {
    console.error("Error fetching user role:", error);
    return null;
  }

  return {
    ...user,
    id: roleData.id, // Use users_role.id instead of auth.users.id for foreign key references
    role: roleData.role,
    first_name: roleData.first_name,
    last_name: roleData.last_name,
  };
};
