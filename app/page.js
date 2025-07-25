import { redirect } from 'next/navigation';

export default function Home() {
  // Check if we're trying to access login, if so don't redirect
  if (typeof window !== 'undefined' && window.location.pathname === '/login') {
    return null;
  }
  
  // Otherwise redirect to /home which is now our main page
  redirect('/home');
}