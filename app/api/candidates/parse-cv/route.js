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

    const prompt = "Extract the following information from the CV and return it as a JSON object. If a field is not found, leave it as an empty string: first_name, middle_name, last_name, email_1, mobile_phone, address, city, state, zip, current_salary, desired_salary, skills, current_company, title, source, referred_by, ownership, general_comments, category, industry, willing_to_relocate (yes/no), date_available (YYYY-MM-DD). Also, extract job experiences relevant to the 'title' into a field called 'relevant_experience'. 'relevant_experience' should be an array of JSON objects, where each object has 'start_date' and 'end_date'. Dates should be in 'YYYY-MM' format. If the end date is the current job, use 'Present'. If no relevant experience is found, leave 'relevant_experience' as an empty array.";

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

      let totalExperienceYears = 0;
      if (parsed.relevant_experience && Array.isArray(parsed.relevant_experience)) {
        const currentDate = new Date();
        parsed.relevant_experience.forEach(exp => {
          if (!exp.start_date) return;

          const startDate = new Date(exp.start_date);
          let endDate;
          if (exp.end_date && (exp.end_date.toLowerCase() === 'present' || exp.end_date.toLowerCase() === 'current')) {
            endDate = currentDate;
          } else if (exp.end_date) {
            endDate = new Date(exp.end_date);
          } else {
            // If end_date is missing, maybe we assume it's a short gig or skip?
            // For now, let's skip if end_date is missing unless it's 'present'
            return;
          }

          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            let diffMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12;
            diffMonths -= startDate.getMonth();
            diffMonths += endDate.getMonth();
            // add one month to include the start and end months
            diffMonths += 1;
            totalExperienceYears += diffMonths / 12;
          }
        });
      }

      let yearsOfExperience = '';
      if (totalExperienceYears >= 5) {
        yearsOfExperience = '5+';
      } else if (totalExperienceYears >= 3 && totalExperienceYears < 5) {
        yearsOfExperience = '3+';
      } else if (totalExperienceYears >= 1 && totalExperienceYears < 3) {
        yearsOfExperience = '1+';
      }

      parsed.years_of_experience = yearsOfExperience;
      delete parsed.relevant_experience;

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
