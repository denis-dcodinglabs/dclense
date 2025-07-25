'use client';

import Link from 'next/link';
import { ArrowRight, Users, BarChart3, FileSpreadsheet, Bell, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-lg border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/home" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
                DCLense
              </Link>
            </div>
            
            <div className="flex items-center space-x-6">
              <Link 
                href="/home"
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                Home
              </Link>
              <Link 
                href="/services"
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                Services
              </Link>
              <Link 
                href="/contact"
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                Contact
              </Link>
              <Link href="/">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Smarter Lead Management Starts Here
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            DCLense is the internal platform powering how DCoding Labs connects with future clients and 
            partners — all built in-house for control, speed, and clarity.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/contact">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Contact Us Below
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/services">
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Intro Paragraph */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-lg text-gray-700 leading-relaxed">
            From outreach to conversion, DCLense helps our teams at DCoding Labs manage leads, track 
            conversations, and optimize contact strategies. Built using Next.js, Supabase, and TailwindCSS, 
            it combines real-time updates, CSV import/export, and role-based collaboration — tailored for 
            modern teams working with modern markets.
          </p>
        </div>
      </section>

      {/* Key Highlights */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Key Highlights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-6 w-6 text-blue-600 mr-2" />
                  Real-time Client and Lead Dashboards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Monitor your pipeline with live updates and comprehensive analytics to track progress and performance.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-6 w-6 text-blue-600 mr-2" />
                  Role-based Access and Google SSO
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Secure authentication with granular permissions ensuring the right people have the right access.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-6 w-6 text-blue-600 mr-2" />
                  Insights on Conversion and Outreach Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Deep analytics on your outreach efforts and conversion rates to optimize your sales strategy.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileSpreadsheet className="h-6 w-6 text-blue-600 mr-2" />
                  Smart CSV Imports with Mapping Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Effortlessly import leads from any source with intelligent field mapping and reusable templates.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-6 w-6 text-blue-600 mr-2" />
                  Reminders, To-dos, and Agent Tracking Tools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Stay organized with automated reminders and comprehensive tracking of all team activities.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-6 w-6 text-blue-600 mr-2" />
                  Built for Modern Teams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Designed with modern workflows in mind, featuring real-time collaboration and intuitive interfaces.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Interested in seeing how we work?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Contact us below to learn more about DCLense and how it powers our lead management process.
          </p>
          <Link href="/contact">
            <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
              Contact Us Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-4">DCLense</h3>
            <p className="text-gray-400 max-w-2xl mx-auto">
              A proprietary lead and client management platform developed by DCoding Labs. 
              Built for modern teams working with modern markets.
            </p>
          </div>
          <div className="border-t border-gray-800 pt-8">
            <p className="text-gray-400">
              © 2024 DCoding Labs. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}