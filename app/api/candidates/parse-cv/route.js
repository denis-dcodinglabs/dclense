import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request) {
  try {
    // Check if API key is configured
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Please set GEMINI_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get('cv');

    if (!file) {
      return NextResponse.json(
        { error: 'No CV file provided' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = file.type;

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "Extract the following information from the CV and return it as a JSON object. If a field is not found, leave it as an empty string: first_name, middle_name, last_name, email_1, mobile_phone, address, city, state, zip, current_salary, desired_salary, years_of_experience, skills, current_company, title, source, referred_by, ownership, general_comments, category, industry, willing_to_relocate (yes/no), date_available (YYYY-MM-DD). IMPORTANT: For years_of_experience, calculate ONLY the experience that is directly relevant to the parsed 'title' field. Sum up the total years from all relevant positions and format the result as follows: if 1-2 years use '1+', if 3-4 years use '3+', if 5+ years use '5+'. If no relevant experience is found, leave as empty string.";

    // Call Gemini API
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
      return NextResponse.json({
        success: true,
        data: parsed
      });
    } catch (jsonError) {
      console.error("Error parsing Gemini response as JSON:", jsonError);
      return NextResponse.json({
        success: false,
        error: "Failed to parse JSON from Gemini",
        rawResponse: text
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Error parsing CV with Gemini:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to parse CV: " + error.message 
      },
      { status: 500 }
    );
  }
}
