export const enrichCompanyData = async (linkedinUrl) => {
  if (!linkedinUrl?.trim()) {
    throw new Error('LinkedIn URL is required');
  }

  try {
    
    const response = await fetch('/api/companies/enrich', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ linkedinUrl }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error || `Server error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error('Invalid response from server');
    }

   
    
    return {
      ...result.data,
      tokenUsage: result.tokenUsage
    };

  } catch (error) {
    console.error('Error enriching company data:', error);
    throw new Error(`Failed to enrich company data: ${error.message}`);
  }
};

