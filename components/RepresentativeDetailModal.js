'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, User, Building2, Calendar, Mail, Linkedin, Phone, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
};

const getStatusBadgeColor = (status) => {
  switch (status) {
    case 'Client':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Converted':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Pending Connection':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Declined':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'Not Interested':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Contacted':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'In Communication':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const ClickableLink = ({ url, children, icon: Icon }) => {
  if (!url) return <span className="text-gray-400">N/A</span>;
  
  const handleClick = (e) => {
    e.stopPropagation();
    window.open(url.startsWith('http') ? url : `https://${url}`, '_blank', 'noopener,noreferrer');
  };

  // Function to shorten URL for display
  const shortenUrl = (url) => {
    if (!url) return '';
    // Remove protocol
    let shortened = url.replace(/^https?:\/\//, '');
    // Remove www.
    shortened = shortened.replace(/^www\./, '');
    // Truncate if too long
    if (shortened.length > 30) {
      shortened = shortened.substring(0, 27) + '...';
    }
    return shortened;
  };
  return (
    <button
      onClick={handleClick}
      className="flex items-center text-blue-600 hover:text-blue-800 hover:underline transition-colors"
    >
      {Icon && <Icon className="h-4 w-4 mr-1" />}
      {typeof children === 'string' && children.includes('http') ? shortenUrl(children) : children}
      <ExternalLink className="h-3 w-3 ml-1" />
    </button>
  );
};

export default function RepresentativeDetailModal({ isOpen, onClose, representativeId }) {
  const router = useRouter();
  const [representative, setRepresentative] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && representativeId) {
      fetchRepresentativeDetails();
    }
  }, [isOpen, representativeId]);

  const fetchRepresentativeDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('representatives')
        .select(`
          *,
          company:company_id(company_name, status, industry, location, website, linkedin_url),
          assigned_user:assigned_to(first_name, last_name, email),
          contacted_user:contacted_by(first_name, last_name, email),
          created_user:created_by(first_name, last_name, email),
          updated_user:updated_by(first_name, last_name, email)
        `)
        .eq('id', representativeId)
        .single();

      if (error) {
        setError('Failed to load representative details');
        console.error('Error fetching representative:', error);
      } else {
        setRepresentative(data);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRepresentative(null);
    setError('');
    
    // Remove repId from URL when closing modal
    const currentUrl = new URL(window.location);
    currentUrl.searchParams.delete('repId');
    router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Representative Details
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {representative && (
          <div className="space-y-6">
            {/* Representative Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-16 w-16">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center">
                        <span className="text-xl font-bold text-white">
                          {representative.first_name?.[0]}{representative.last_name?.[0]}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h2 className="text-2xl font-bold text-gray-900">
                        {representative.first_name} {representative.last_name}
                      </h2>
                      <div className="flex items-center mt-2 space-x-4">
                        {representative.role && (
                          <span className="text-gray-600">{representative.role}</span>
                        )}
                        {representative.company && (
                          <div className="flex items-center text-gray-600">
                            <Building2 className="h-4 w-4 mr-1" />
                            {representative.company.company_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    {representative.outcome && (
                      <Badge className={`${getStatusBadgeColor(representative.outcome)} border`}>
                        {representative.outcome}
                      </Badge>
                    )}
                    {representative.status && !representative.outcome && (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 border">
                        {representative.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">LinkedIn Profile</label>
                    <div className="mt-1">
                      <ClickableLink url={representative.linkedin_profile_url} icon={Linkedin}>
                        {representative.linkedin_profile_url ? 'View LinkedIn Profile' : 'N/A'}
                      </ClickableLink>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Method of Contact</label>
                    <div className="mt-1 text-gray-900">
                      {representative.method_of_contact || 'N/A'}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Contact Origin</label>
                    <div className="mt-1 text-gray-900">
                      {representative.contact_source || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1 text-gray-900">
                      {representative.status || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Contact Date</label>
                    <div className="mt-1 flex items-center text-gray-900">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(representative.contact_date)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Assignment & Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Assigned To</label>
                    <div className="mt-1 text-gray-900">
                      {representative.assigned_user ? 
                        `${representative.assigned_user.first_name} ${representative.assigned_user.last_name}` : 
                        'Unassigned'
                      }
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Contacted By</label>
                    <div className="mt-1 text-gray-900">
                      {representative.contacted_user ? 
                        `${representative.contacted_user.first_name} ${representative.contacted_user.last_name}` : 
                        'Not contacted'
                      }
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Outcome</label>
                    <div className="mt-1 text-gray-900">
                      {representative.outcome || 'No outcome yet'}
                    </div>
                  </div>

                  {representative.reminder_date && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Reminder Date</label>
                      <div className="mt-1 text-gray-900 flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-orange-500" />
                        {formatDate(representative.reminder_date)}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-500">Created</label>
                    <div className="mt-1 text-gray-900">
                      {formatDate(representative.created_at)}
                      {representative.created_user && (
                        <span className="text-sm text-gray-500 ml-2">
                          by {representative.created_user.first_name} {representative.created_user.last_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Activity</label>
                    <div className="mt-1 text-gray-900">
                      {formatDate(representative.updated_at)}
                      {representative.updated_user && (
                        <span className="text-sm text-gray-500 ml-2">
                          by {representative.updated_user.first_name} {representative.updated_user.last_name}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Follow-up Dates */}
            {representative.follow_up_dates && representative.follow_up_dates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Follow-up Dates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {representative.follow_up_dates.map((date, index) => (
                      <Badge key={index} variant="outline" className="text-sm">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(date)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Company Information */}
            {representative.company && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Building2 className="h-5 w-5 mr-2" />
                    Company Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Company Name</label>
                      <div className="mt-1 text-gray-900 font-medium">
                        {representative.company.company_name}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Industry</label>
                      <div className="mt-1 text-gray-900">
                        {representative.company.industry || 'N/A'}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Location</label>
                      <div className="mt-1 flex items-center text-gray-900">
                        <MapPin className="h-4 w-4 mr-1" />
                        {representative.company.location || 'N/A'}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <div className="mt-1">
                        {representative.company.status ? (
                          <Badge className={`${getStatusBadgeColor(representative.company.status)} border`}>
                            {representative.company.status}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">No status</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Website</label>
                      <div className="mt-1">
                        <ClickableLink url={representative.company.website}>
                          {representative.company.website || 'N/A'}
                        </ClickableLink>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">LinkedIn</label>
                      <div className="mt-1">
                        <ClickableLink url={representative.company.linkedin_url} icon={Linkedin}>
                          {representative.company.linkedin_url ? 'View Company LinkedIn' : 'N/A'}
                        </ClickableLink>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {representative.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-900 whitespace-pre-wrap">{representative.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}