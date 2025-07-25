'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      const user = await getCurrentUser();
      
      if (user) {
        // If user is logged in, redirect to dashboard
        router.push('/dashboard');
      } else {
        // If user is not logged in, redirect to home page
        router.push('/home');
      }
    };

    checkUserAndRedirect();
  }, [router]);

  // Show loading while checking authentication
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">Loading DCLense...</h2>
      </div>
    </div>
  );
}