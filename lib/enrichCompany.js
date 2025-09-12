import { GoogleGenerativeAI } from "@google/generative-ai";

// Configuration - these can be moved to environment variables later
const API_KEY =  'AIzaSyASE6Rl73kfcKdJ5mrsNuw3_ZNXD8lUsqE';
const GEMINI_MODEL =  'gemini-1.5-flash-latest';

export const enrichCompanyData = async (linkedinUrl) => {
  if (!linkedinUrl?.trim()) {
    throw new Error('LinkedIn URL is required');
  }

  // Check if API key is configured
  if (!API_KEY) {
    throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY environment variable.');
  }

  try {
    const aboutUrl = linkedinUrl.endsWith('/') ? `${linkedinUrl}about/` : `${linkedinUrl}/about/`;
    
    const prompt = `Extract the following information only from the LinkedIn company page, don't extract from other pages and return it as a JSON object. If a field is not found, leave it as an empty string:

- company_name (Company Name): The company name
- location :get Headquarters from LinkedIn about page, 
- industry :get Industry from LinkedIn about page, 
- number_of_employees: get Company Size from LinkedIn about page, Number of employees in format like "11-50", "51-200", "1000+" etc.
- website (Website):get Website from LinkedIn about page,
This is very important, extract only from the LinkedIn about page, exactly those fields: Website, Industry, Company Size, Headquarters.
Return only the JSON object with these exact field names. No additional text or explanation.

URL to analyze: ${aboutUrl}

Expected JSON format:
{
  "company_name": "",
  "location": "",
  "industry": "",
  "number_of_employees": "",
  "website": ""
}
  Get LinkedIn public data, this is available.`
;

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    // Call Gemini API
    const result = await model.generateContent([prompt]);
    const response = await result.response;
    const text = response.text();
    
    if (!text?.trim()) {
      throw new Error('No data received from the API');
    }

    console.log('Raw Gemini response:', text);
    console.log('Response type:', typeof text);
    console.log('Response length:', text.length);
    
    const enrichedData = parseEnrichmentResponse(text);
    console.log('Parsed enriched data:', enrichedData);
    
    return enrichedData;
  } catch (error) {
    console.error('Error enriching company data:', error);
    throw new Error(`Failed to enrich company data: ${error.message}`);
  }
};

export const parseEnrichmentResponse = (text) => {
  // Initialize default values
  const enrichedData = {
    company_name: '',
    location: '',
    industry: '',
    number_of_employees: '',
    website: ''
  };

  try {
    // Remove markdown fences if present (similar to CV parsing)
    let jsonString = text.replace(/^```json\n/, '').replace(/\n```$/, '').trim();
    
    // Alternative approach - handle different markdown fence variations
    if (jsonString.includes('```')) {
      // Extract content between triple backticks
      const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonString = match[1].trim();
      }
    }
    
    console.log('Cleaned JSON string:', jsonString);
    console.log('JSON string length:', jsonString.length);
    
    // Try to parse as JSON
    const parsed = JSON.parse(jsonString);
    console.log('Successfully parsed JSON:', parsed);
    
    // Validate and assign values, only if they exist and are not empty/null/N/A
    if (parsed.company_name && parsed.company_name.trim() && parsed.company_name !== 'N/A') {
      enrichedData.company_name = parsed.company_name.trim();
      console.log('Set company_name:', enrichedData.company_name);
    }
    
    if (parsed.location && parsed.location.trim() && parsed.location !== 'N/A') {
      enrichedData.location = parsed.location.trim();
      console.log('Set location:', enrichedData.location);
    }
    
    if (parsed.industry && parsed.industry.trim() && parsed.industry !== 'N/A') {
      enrichedData.industry = parsed.industry.trim();
      console.log('Set industry:', enrichedData.industry);
    }
    
    if (parsed.number_of_employees && parsed.number_of_employees.trim() && parsed.number_of_employees !== 'N/A') {
      enrichedData.number_of_employees = parsed.number_of_employees.trim();
      console.log('Set number_of_employees:', enrichedData.number_of_employees);
    }
    
    if (parsed.website && parsed.website.trim() && parsed.website !== 'N/A') {
      enrichedData.website = parsed.website.trim();
      console.log('Set website:', enrichedData.website);
    }
    
  } catch (jsonError) {
    console.error('Error parsing JSON response:', jsonError);
    console.log('Raw response:', text);
    
    // Fallback: try to extract data from text format
    const lines = text.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      
      if (key && value) {
        const cleanKey = key.trim().toLowerCase();
        const cleanValue = value.trim();
        
        // Only process valid values
        if (cleanValue && cleanValue !== 'N/A' && cleanValue !== 'Not available') {
          switch (cleanKey) {
            case 'company_name':
            case 'name':
              enrichedData.company_name = cleanValue;
              break;
            case 'location':
              enrichedData.location = cleanValue;
              break;
            case 'industry':
              enrichedData.industry = cleanValue;
              break;
            case 'number_of_employees':
            case 'employees':
            case 'company size':
              enrichedData.number_of_employees = cleanValue;
              break;
            case 'website':
              enrichedData.website = cleanValue;
              break;
          }
        }
      }
    });
  }

  console.log('Final enrichedData before return:', enrichedData);
  return enrichedData;
};
