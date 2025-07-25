'use client';

import Link from 'next/link';
import { ArrowRight, Upload, Download, Users, BarChart3, Shield, Database, Bell, FileSpreadsheet, Zap, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ServicesPage() {
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
                href="/"
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                Home
              </Link>
              <Link 
                href="/services"
                className="text-blue-600 border-b-2 border-blue-600 pb-1 font-medium"
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
            What DCLense Powers Inside DCoding Labs
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            DCLense is more than just a CRM. It's an internal platform that brings structure, analytics, and 
            automation to our client acquisition and relationship management processes.
          </p>
        </div>
      </section>

      {/* Main Services Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Lead & Client Management
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Import Leads via Flexible CSV or API
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Smart field mapping with reusable templates</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Bulk import thousands of leads in seconds</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Automatic duplicate detection and merging</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">API integration for real-time lead capture</span>
                </li>
              </ul>
            </div>
            <Card className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <Upload className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Seamless Data Import</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <Card className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 order-2 lg:order-1">
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <BarChart3 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Advanced Analytics</p>
                </div>
              </div>
            </Card>
            <div className="order-1 lg:order-2">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Track and Analyze Lead Progression
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Real-time pipeline visualization</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Conversion rate tracking by source</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Agent performance metrics</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Custom reporting and dashboards</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Organize Teams with Role-Based Access
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Admin, Editor, and Viewer permission levels</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Secure authentication with Google SSO</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Lead assignment and territory management</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Audit logs for compliance and tracking</span>
                </li>
              </ul>
            </div>
            <Card className="p-8 bg-gradient-to-br from-purple-50 to-pink-50">
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <Shield className="h-16 w-16 text-purple-600 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Secure Team Management</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <Card className="p-8 bg-gradient-to-br from-orange-50 to-red-50 order-2 lg:order-1">
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <Bell className="h-16 w-16 text-orange-600 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Smart Automation</p>
                </div>
              </div>
            </Card>
            <div className="order-1 lg:order-2">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Automate Follow-ups and Reminders
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Automated reminder notifications</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Follow-up scheduling and tracking</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Task assignment and progress monitoring</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Real-time notifications and updates</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Additional Platform Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Download className="h-6 w-6 text-blue-600 mr-2" />
                  Data Export & Reporting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Export data in multiple formats with custom field selection and automated report generation.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-6 w-6 text-blue-600 mr-2" />
                  Real-time Data Sync
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Live updates across all team members with instant synchronization and conflict resolution.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileSpreadsheet className="h-6 w-6 text-blue-600 mr-2" />
                  Template Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Save and reuse import templates, email templates, and workflow configurations.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-6 w-6 text-blue-600 mr-2" />
                  Team Collaboration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Built-in messaging, note sharing, and collaborative lead management tools.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-6 w-6 text-blue-600 mr-2" />
                  API Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Connect with external tools and services through our comprehensive REST API.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-6 w-6 text-blue-600 mr-2" />
                  Security & Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Enterprise-grade security with audit trails, data encryption, and compliance features.
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
            Ready to See DCLense in Action?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Contact us to learn more about how DCLense powers our lead management process and drives results for DCoding Labs.
          </p>
          <Link href="/contact">
            <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
              Get in Touch
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