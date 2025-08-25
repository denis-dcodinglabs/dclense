'use client';

import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API; // Replace with your actual API key or environment variable

export default async function GeminiCVParser(file) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const base64 = await fileToBase64(file);
    const mimeType = file.type;

    const prompt = "Extract the following information from the CV and return it as a JSON object. If a field is not found, leave it as an empty string: first_name, middle_name, last_name, email_1, mobile_phone, address, city, state, zip, current_salary, desired_salary, years_of_experience, skills, current_company, title, source, referred_by, ownership, general_comments, category, industry, willing_to_relocate (yes/no), date_available (YYYY-MM-DD). IMPORTANT: For years_of_experience, calculate ONLY the experience that is directly relevant to the parsed 'title' field. Sum up the total years from all relevant positions and format the result as follows: if 1-2 years use '1+', if 3-4 years use '3+', if 5+ years use '5+'. If no relevant experience is found, leave as empty string.";

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64,
          mimeType: mimeType,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    console.log("Gemini Response:", text);

    // Remove markdown fences if present
    const jsonString = text.replace(/^```json\n/, '').replace(/\n```$/, '');
    console.log("Cleaned JSON String:", jsonString);

    // Attempt to parse the text as JSON
    try {
      const parsed = JSON.parse(jsonString);
      return parsed;
    } catch (jsonError) {
      console.error("Error parsing Gemini response as JSON:", jsonError);
      // If it's not valid JSON, try to extract relevant parts or return as is
      // For now, returning raw text if JSON parsing fails
      return { error: "Failed to parse JSON from Gemini, raw response: " + text };
    }
  } catch (error) {
    console.error("Error parsing CV with Gemini:", error);
    throw new Error("Failed to parse CV: " + error.message);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
}