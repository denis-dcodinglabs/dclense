'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUp, signIn, resetPassword } from '@/lib/auth';

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (isForgotPassword) {
      // Handle forgot password
      if (!email) {
        setError('Please enter your email address');
        setLoading(false);
        return;
      }

      try {
        const result = await resetPassword(email);
        
        if (result.error) {
          setError(result.error.message);
        } else {
          setMessage('Password reset email sent! Please check your inbox and spam folder.');
          setEmail('');
        }
      } catch (err) {
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Handle sign in/sign up
    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      let result;
      if (isSignUp) {
        result = await signUp(email, password);
      } else {
        result = await signIn(email, password);
      }

      if (result.error) {
        setError(result.error.message);
      } else {
        // Only redirect if authentication was successful
        if (result.data && result.data.user) {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = (mode) => {
    setError('');
    setMessage('');
    setEmail('');
    setPassword('');
    
    if (mode === 'forgotPassword') {
      setIsForgotPassword(true);
      setIsSignUp(false);
    } else if (mode === 'signUp') {
      setIsForgotPassword(false);
      setIsSignUp(true);
    } else {
      setIsForgotPassword(false);
      setIsSignUp(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">DCLense</h1>
          <h2 className="text-2xl font-semibold text-gray-700">
            {isForgotPassword ? 'Reset your password' : 
             isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-gray-600">
            {isForgotPassword ? 'Enter your email to receive a reset link' :
             isSignUp ? 'Join DCLense today' : 'Welcome back to DCLense'}
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-lg rounded-lg border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}
            
            {message && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                {message}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your email"
              />
            </div>

            {!isForgotPassword && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your password"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Loading...' : 
               isForgotPassword ? 'Send Reset Email' :
               isSignUp ? 'Sign up' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {isForgotPassword ? (
              <button
                onClick={() => handleModeSwitch('signIn')}
                className="text-blue-600 hover:text-blue-500 font-medium transition-colors"
              >
                Back to sign in
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleModeSwitch(isSignUp ? 'signIn' : 'signUp')}
                  className="text-blue-600 hover:text-blue-500 font-medium transition-colors block"
                >
                  {isSignUp 
                    ? 'Already have an account? Sign in' 
                    : "Don't have an account? Sign up"
                  }
                </button>
                {!isSignUp && (
                  <button
                    onClick={() => handleModeSwitch('forgotPassword')}
                    className="text-gray-600 hover:text-gray-500 font-medium transition-colors block text-sm"
                  >
                    Forgot your password?
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}