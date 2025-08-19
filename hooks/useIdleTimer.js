import { useEffect, useRef, useCallback } from 'react';
import { signOut } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const IDLE_TIMEOUT = 2 *60* 60 * 1000; //

export const useIdleTimer = () => {
  const router = useRouter();
  const timeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Function to handle user logout
  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error during idle logout:', error);
      // Force redirect even if signOut fails
      router.push('/');
    }
  }, [router]);

  // Function to reset the idle timer
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for logout
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, IDLE_TIMEOUT);
  }, [handleLogout]);

  // List of events that indicate user activity
  const events = [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click',
    'keydown'
  ];

  useEffect(() => {
    // Add event listeners for user activity
    const handleActivity = () => {
      resetTimer();
    };

    // Start the timer initially
    resetTimer();

    // Add event listeners to detect user activity
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Cleanup function
    return () => {
      // Remove event listeners
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimer]);

  // Return function to manually reset the timer if needed
  return { resetTimer };
};