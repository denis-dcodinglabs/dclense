import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to /home which is now our main page
  redirect('/home');
}