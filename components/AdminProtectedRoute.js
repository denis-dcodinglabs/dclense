'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserWithRole } from '@/lib/auth';

export default function AdminProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await getCurrentUserWithRole();
      
      if (!currentUser) {
        router.push('/');
      } else if (currentUser.role !== 'Admin') {
        // Redirect non-admin users to dashboard
        router.push('/dashboard');
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    };

    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'Admin') {
    return null;
  }

  return children;
}