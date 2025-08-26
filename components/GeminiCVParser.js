'use client';

export default async function GeminiCVParser(file) {
  try {
    // Create FormData to send the file to the API
    const formData = new FormData();
    formData.append('cv', file);

    // Call the server-side API route
    const response = await fetch('/api/candidates/parse-cv', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `HTTP error! status: ${response.status}`);
    }

    if (!result.success) {
      throw new Error(result.error || 'Failed to parse CV');
    }

    console.log("CV parsing successful:", result.data);
    return result.data;

  } catch (error) {
    console.error("Error parsing CV:", error);
    throw new Error("Failed to parse CV: " + error.message);
  }
}