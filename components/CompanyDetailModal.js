'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Building2, MapPin, Users, Calendar, User, Phone, Mail, Linkedin, Globe } from 'lucide-react';
import { getCompanyById, updateCompany } from '@/lib/companies';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RepresentativeDetailModal from './RepresentativeDetailModal';
import RepresentativeDialog from './RepresentativeDialog';
import { createRepresentative } from '@/lib/representatives';
import { getCurrentUserWithRole } from '@/lib/auth';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
};

const getStatusBadgeColor = (status) => {
  switch (status) {
    case 'Client':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Contacted':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Pending Connection':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Declined':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'Not Interested':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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

export default function CompanyDetailModal({ isOpen, onClose, companyId, onCompanyUpdated }) {
  const router = useRouter();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [repModalOpen, setRepModalOpen] = useState(false);
  const [selectedRepId, setSelectedRepId] = useState(null);
  const [repFormOpen, setRepFormOpen] = useState(false);
  const [savingRep, setSavingRep] = useState(false);
  const [repErrorMessage, setRepErrorMessage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [savingStatus, setSavingStatus] = useState(false);

  const INLINE_STATUS_OPTIONS = [
    { value: 'No Status', label: 'No Status' },
    { value: 'Declined', label: 'Declined' },
    { value: 'Company Not a Fit', label: 'Company Not a Fit' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Client', label: 'Client' },
    { value: 'Revisit Later', label: 'Revisit Later' },
    { value: 'No Reply', label: 'No Reply' },
  ];

  useEffect(() => {
    if (isOpen && companyId) {
      fetchCompanyDetails();
    }
  }, [isOpen, companyId]);

  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUserWithRole();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const fetchCompanyDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await getCompanyById(companyId);
      if (error) {
        setError('Failed to load company details');
        console.error('Error fetching company:', error);
      } else {
        setCompany(data);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCompany(null);
    setError('');
    
    // Remove companyId from URL when closing modal
    const currentUrl = new URL(window.location);
    currentUrl.searchParams.delete('companyId');
    router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
    
    onClose();
  };

  const handleStatusChange = async (newStatus) => {
    if (!currentUser || !company) return;
    setSavingStatus(true);
    try {
      await updateCompany(company.id, { status: newStatus }, currentUser.id);
      setCompany((prev) => ({ ...prev, status: newStatus }));
      if (onCompanyUpdated) {
        onCompanyUpdated(company.id, newStatus);
      }
    } catch (err) {
      console.error('Error updating company status:', err);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleRepresentativeClick = (repId) => {
    setSelectedRepId(repId);
    setRepModalOpen(true);
  };

  const handleSaveRepresentative = async (repData) => {
    if (!currentUser) return;
    setSavingRep(true);
    setRepErrorMessage(null); // Clear any previous errors
    try {
      const result = await createRepresentative(repData, currentUser.id);
      if (!result.error) {
        setRepFormOpen(false);
        setRepErrorMessage(null);
        // Refresh company details to include the new representative with joined fields
        await fetchCompanyDetails();
        toast.success('Representative created successfully');
      } else {
        // Handle duplicate error or other errors
        if (result.error.code === 'DUPLICATE_REPRESENTATIVE') {
          setRepErrorMessage(result.error.message);
          toast.error(result.error.message);
        } else {
          const errorMessage = 'Failed to create representative: ' + (result.error.message || 'Unknown error');
          setRepErrorMessage(errorMessage);
          toast.error(errorMessage);
        }
      }
    } catch (err) {
      console.error('Error creating representative:', err);
      const errorMessage = 'An unexpected error occurred while creating the representative';
      setRepErrorMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSavingRep(false);
    }
  };
  
  // Filter out soft-deleted representatives from view
  const visibleRepresentatives = (company?.representatives || []).filter((rep) => rep?.is_deleted !== true);
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Company Details
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

        {company && (
          <div className="space-y-6">
            {/* Company Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-16 w-16">
                      <div className="h-16 w-16 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-xl font-bold text-white">
                          {company.company_name?.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h2 className="text-2xl font-bold text-gray-900">{company.company_name}</h2>
                      <div className="flex items-center mt-2 space-x-4">
                        {company.industry && (
                          <span className="text-gray-600">{company.industry}</span>
                        )}
                        {company.location && (
                          <div className="flex items-center text-gray-600">
                            <MapPin className="h-4 w-4 mr-1" />
                            {company.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <div className="w-56">
                      <label className="text-xs font-medium text-gray-500">Status</label>
                      <Select
                        value={company.status || 'No Status'}
                        onValueChange={handleStatusChange}
                        disabled={savingStatus}
                      >
                        <SelectTrigger className="w-full h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INLINE_STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-xs">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {company.number_of_employees && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-1" />
                        {company.number_of_employees} employees
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Company Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Company Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Website</label>
                    <div className="mt-1">
                      <ClickableLink url={company.website} icon={Globe}>
                        {company.website || 'N/A'}
                      </ClickableLink>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">LinkedIn</label>
                    <div className="mt-1">
                      <ClickableLink url={company.linkedin_url} icon={Linkedin}>
                        {company.linkedin_url ? 'View LinkedIn Profile' : 'N/A'}
                      </ClickableLink>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Contact Origin</label>
                    <div className="mt-1 text-gray-900">
                      {company.source || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Assigned To</label>
                    <div className="mt-1 text-gray-900">
                      {company.assigned_user ? 
                        `${company.assigned_user.first_name} ${company.assigned_user.last_name}` : 
                        'Unassigned'
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Activity Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Activity</label>
                    <div className="mt-1 flex items-center text-gray-900">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(company.last_activity_date)}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Created</label>
                    <div className="mt-1 text-gray-900">
                      {formatDate(company.created_at)}
                      {company.created_user && (
                        <span className="text-sm text-gray-500 ml-2">
                          by {company.created_user.first_name} {company.created_user.last_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Updated</label>
                    <div className="mt-1 text-gray-900">
                      {formatDate(company.updated_at)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notes */}
            {company.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-900 whitespace-pre-wrap">{company.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Representatives */}

        {/* Representative Detail Modal */}
        <RepresentativeDetailModal
          isOpen={repModalOpen}
          onClose={() => setRepModalOpen(false)}
          representativeId={selectedRepId}
        />
        {/* Add/Edit Representative Dialog */}
        <RepresentativeDialog
          isOpen={repFormOpen}
          onClose={() => {
            setRepFormOpen(false);
            setRepErrorMessage(null); // Clear error when closing
          }}
          onSave={handleSaveRepresentative}
          representative={null}
          loading={savingRep}
          preselectedCompanyId={companyId}
          errorMessage={repErrorMessage}
          onClearError={() => setRepErrorMessage(null)}
        />
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Representatives ({visibleRepresentatives.length})
                  </CardTitle>
                  <Button variant="outline" onClick={() => setRepFormOpen(true)}>
                    Add Representative
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {visibleRepresentatives.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No representatives found for this company.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {visibleRepresentatives.map((rep) => (
                      <div key={rep.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center">
                                <span className="text-sm font-medium text-white">
                                  {rep.first_name?.[0]}{rep.last_name?.[0]}
                                </span>
                              </div>
                            </div>
                            <div className="ml-3">
                              <button
                                onClick={() => handleRepresentativeClick(rep.id)}
                                className="text-lg font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left"
                              >
                                {rep.first_name} {rep.last_name}
                              </button>
                              {rep.role && (
                                <p className="text-sm text-gray-600">{rep.role}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            {rep.outcome && (
                              <Badge className={`text-xs ${
                                rep.outcome === 'Client' ? 'bg-green-100 text-green-800' :
                                rep.outcome === 'Declined' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {rep.outcome}
                              </Badge>
                            )}
                            {rep.status && !rep.outcome && (
                              <Badge className="text-xs bg-gray-100 text-gray-800">
                                {rep.status}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            {rep.linkedin_profile_url && (
                              <div>
                                <label className="text-xs font-medium text-gray-500">LinkedIn</label>
                                <div className="mt-1">
                                  <ClickableLink url={rep.linkedin_profile_url} icon={Linkedin}>
                                    View Profile
                                  </ClickableLink>
                                </div>
                              </div>
                            )}
                            
                            {rep.contact_source && (
                              <div>
                                <label className="text-xs font-medium text-gray-500">Contact Origin</label>
                                <div className="mt-1 text-sm text-gray-900">{rep.contact_source}</div>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            {rep.contact_date && (
                              <div>
                                <label className="text-xs font-medium text-gray-500">Contact Date</label>
                                <div className="mt-1 text-sm text-gray-900">{formatDate(rep.contact_date)}</div>
                              </div>
                            )}

                            {rep.assigned_user && (
                              <div>
                                <label className="text-xs font-medium text-gray-500">Assigned To</label>
                                <div className="mt-1 text-sm text-gray-900">
                                  {rep.assigned_user.first_name} {rep.assigned_user.last_name}
                                </div>
                              </div>
                            )}

                            {rep.contacted_user && (
                              <div>
                                <label className="text-xs font-medium text-gray-500">Contacted By</label>
                                <div className="mt-1 text-sm text-gray-900">
                                  {rep.contacted_user.first_name} {rep.contacted_user.last_name}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {rep.follow_up_dates && rep.follow_up_dates.length > 0 && (
                          <div className="mt-3">
                            <label className="text-xs font-medium text-gray-500">Follow-up Dates</label>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {rep.follow_up_dates.map((date, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {formatDate(date)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {rep.notes && (
                          <div className="mt-3">
                            <label className="text-xs font-medium text-gray-500">Notes</label>
                            <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">
                              {rep.notes}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}