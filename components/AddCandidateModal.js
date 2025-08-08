'use client';

import React, { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { saveCandidateWithCV } from '../app/candidates/candidatesHelpers';

const initialForm = {
  first_name: '',
  middle_name: '',
  last_name: '',
  status: '',
  title: '',
  current_company: '',
  source: '',
  referred_by: '',
  ownership: '',
  email_1: '',
  email_2: '',
  mobile_phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  current_salary: '',
  desired_salary: '',
  date_available: '',
  willing_to_relocate: '',
  general_comments: '',
  category: '',
  skills: '',
  industry: '',
  years_of_experience: '',
  user_date_added: new Date().toISOString().split('T')[0], // Set today's date as default
  cv: null,
};

export default function AddCandidateModal({ onCandidateAdded }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setForm((f) => ({ ...f, [name]: files[0] }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const handleRemoveCV = () => {
    setForm((f) => ({ ...f, cv: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Use the helper function to save candidate with CV
      await saveCandidateWithCV(form);
      
      setOpen(false);
      setForm(initialForm);
      if (onCandidateAdded) onCandidateAdded();
    } catch (err) {
      setError(err.message || 'Error adding candidate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add Candidate</Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="bg-white dark:bg-gray-900 w-full h-full max-w-none max-h-none overflow-auto shadow-lg rounded-none p-0">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold">Add Candidate</h2>
                  <button
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl font-bold focus:outline-none"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <form className="space-y-4 px-6 py-4 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 64px)' }} onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input name="first_name" placeholder="First Name" value={form.first_name} onChange={handleChange} required />
                    <Input name="middle_name" placeholder="Middle Name" value={form.middle_name} onChange={handleChange} />
                    <Input name="last_name" placeholder="Last Name" value={form.last_name} onChange={handleChange} required />
                    <Input name="status" placeholder="Status" value={form.status} onChange={handleChange} />
                    <Input name="title" placeholder="Title" value={form.title} onChange={handleChange} />
                    <Input name="current_company" placeholder="Current Company" value={form.current_company} onChange={handleChange} />
                    <Input name="source" placeholder="Source" value={form.source} onChange={handleChange} />
                    <Input name="referred_by" placeholder="Referred By" value={form.referred_by} onChange={handleChange} />
                    <Input name="ownership" placeholder="Ownership" value={form.ownership} onChange={handleChange} />
                  </div>
                  <div className="font-semibold mt-2">Contact Information</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input name="email_1" placeholder="Email 1" value={form.email_1} onChange={handleChange} />
                    <Input name="email_2" placeholder="Email 2" value={form.email_2} onChange={handleChange} />
                    <Input name="mobile_phone" placeholder="Mobile Phone" value={form.mobile_phone} onChange={handleChange} />
                    <Input name="address" placeholder="Address" value={form.address} onChange={handleChange} />
                    <Input name="city" placeholder="City" value={form.city} onChange={handleChange} />
                    <Input name="state" placeholder="State" value={form.state} onChange={handleChange} />
                    <Input name="zip" placeholder="Zip" value={form.zip} onChange={handleChange} />
                  </div>
                  <div className="font-semibold mt-2">General Information</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input name="current_salary" placeholder="Current Salary" value={form.current_salary} onChange={handleChange} />
                    <Input name="desired_salary" placeholder="Desired Salary" value={form.desired_salary} onChange={handleChange} />
                    <div className="flex">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Available</label>
                      <Input 
                        name="date_available" 
                        type="date" 
                        value={form.date_available} 
                        onChange={handleChange}
                        className="w-full"
                      />
                    </div>
                    <div className="flex">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Willing to Relocate</label>
                      <select 
                        name="willing_to_relocate" 
                        value={form.willing_to_relocate} 
                        onChange={handleChange} 
                        className="border rounded-md px-3 py-2 text-sm w-full"
                      >
                        <option value="">Select an option</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <Input name="general_comments" placeholder="General Candidate Comments" value={form.general_comments} onChange={handleChange} />
                  </div>
                  <div className="font-semibold mt-2">Category & Skills</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input name="category" placeholder="Category" value={form.category} onChange={handleChange} />
                    <Input name="skills" placeholder="Skills" value={form.skills} onChange={handleChange} />
                    <Input name="industry" placeholder="Industry" value={form.industry} onChange={handleChange} />
                    <Input name="years_of_experience" placeholder="Years of Experience" value={form.years_of_experience} onChange={handleChange} />
                    <div className="flex">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Added</label>
                      <Input 
                        name="user_date_added" 
                        type="date" 
                        value={form.user_date_added} 
                        onChange={handleChange}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CV Document</label>
                    {form.cv ? (
                      <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-md bg-gray-50">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">{form.cv.name}</p>
                          <p className="text-xs text-gray-500">{(form.cv.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCV}
                          className="text-red-500 hover:text-red-700 text-lg font-bold focus:outline-none"
                          aria-label="Remove CV"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <input 
                        type="file" 
                        name="cv" 
                        accept="application/pdf" 
                        onChange={handleChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    )}
                  </div>
                  {error && <div className="text-red-500 text-sm">{error}</div>}
                  <div className="flex justify-end gap-2 mt-4">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
                    <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Candidate'}</Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}