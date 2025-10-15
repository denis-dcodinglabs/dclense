import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request) {
  // Initialize Gemini AI inside the function to avoid build-time issues
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
  try {
    const body = await request.json();
    const { linkedinUrl } = body;

    if (!linkedinUrl?.trim()) {
      return NextResponse.json(
        { error: "LinkedIn URL is required" },
        { status: 400 }
      );
    }

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY environment variable not set");
      return NextResponse.json(
        {
          error:
            "Gemini API key not configured. Please set GEMINI_API_KEY environment variable.",
        },
        { status: 500 }
      );
    }

    console.log("Starting enrichment for:", linkedinUrl);

    // Step 1: Scrape LinkedIn main page
    const targetUrl = linkedinUrl.trim();

    console.log("Scraping URL:", targetUrl);

    let browser;
    let scrapedContent = "";

    try {
      // Launch Puppeteer browser with enhanced configuration
      console.log("Launching Puppeteer browser...");
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor",
        ],
      });
      console.log("Browser launched successfully");

      const page = await browser.newPage();
      console.log("New page created");

      // Set user agent to avoid being blocked
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );
      console.log("User agent set");

      // Set viewport
      await page.setViewport({ width: 1366, height: 768 });
      console.log("Viewport set");

      // Navigate to the page with timeout
      console.log("Navigating to:", targetUrl);
      await page.goto(targetUrl, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });
      console.log("Page navigation completed");

      // Wait for content to load using modern approach
      console.log("Waiting for content to load...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
      console.log("Wait completed, extracting content...");

      // Extract relevant content from the page
      scrapedContent = await page.evaluate(() => {
        // Remove scripts and styles
        const scripts = document.querySelectorAll("script, style");
        scripts.forEach((el) => el.remove());

        // Focus on main content areas that typically contain company info on main page
        const selectors = [
          ".org-top-card-summary-info-list",
          ".org-page-header__content",
          ".org-page-details",
          ".org-top-card-summary",
          ".break-words",
          ".artdeco-card",
          ".org-grid__core",
          "main",
          ".organization-outlet",
          ".org-company-employees-snackbar",
          ".org-top-card",
        ];

        let content = "";

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el) => {
            if (el && el.textContent) {
              content += el.textContent.trim() + "\n";
            }
          });
        }

        // If no specific selectors worked, get body content but filter it
        if (!content.trim()) {
          const body = document.body;
          if (body) {
            content = body.textContent || "";
          }
        }

        // Clean up the content
        return content.replace(/\s+/g, " ").replace(/\n+/g, "\n").trim();
      });

      console.log("Scraped content length:", scrapedContent.length);
      console.log("Scraped content preview:", scrapedContent.substring(0, 500));
    } catch (scrapeError) {
      console.error("Error during scraping:", scrapeError);
      return NextResponse.json(
        {
          error: "Failed to scrape LinkedIn main page: " + scrapeError.message,
        },
        { status: 500 }
      );
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    if (!scrapedContent.trim()) {
      return NextResponse.json(
        { error: "No content could be scraped from the LinkedIn main page" },
        { status: 400 }
      );
    }

    // Step 2: Send scraped content to Gemini for enrichment
    const prompt = `Analyze the following LinkedIn company page content and extract company information. Return ONLY a JSON object with these exact fields. If information is not found, use an empty string:

Content to analyze:
${scrapedContent}

Extract and return only this JSON format:
{
  "company_name": "Company name from the page",
  "location": "Company headquarters/location",
  "industry": "Company industry",
  "number_of_employees": "Employee count (format like '11-50', '51-200', '1000+', etc.)",
  "website": "Company website URL"
}

Return ONLY the JSON object, no additional text or explanation.`;

    console.log("Sending content to Gemini...");

    try {
      const result = await model.generateContent([prompt]);
      const response = await result.response;
      const text = response.text();

      // Get token usage information
      const usageMetadata = response.usageMetadata || {};
      const tokenUsage = {
        promptTokens: usageMetadata.promptTokenCount || 0,
        candidatesTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0,
      };

      console.log("Token usage:", tokenUsage);

      if (!text?.trim()) {
        return NextResponse.json(
          { error: "No response received from AI service" },
          { status: 500 }
        );
      }

      console.log("Gemini response:", text);

      // Parse the response
      const enrichedData = parseEnrichmentResponse(text);

      console.log("Final enriched data:", enrichedData);

      return NextResponse.json({
        success: true,
        data: enrichedData,
        tokenUsage: tokenUsage,
      });
    } catch (aiError) {
      console.error("Error calling Gemini API:", aiError);
      return NextResponse.json(
        { error: "Failed to process content with AI: " + aiError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("General error in enrich endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}

function parseEnrichmentResponse(text) {
  // Initialize default values
  const enrichedData = {
    company_name: "",
    location: "",
    industry: "",
    number_of_employees: "",
    website: "",
  };

  try {
    // Clean the response text
    let jsonString = text
      .replace(/^```json\n/, "")
      .replace(/\n```$/, "")
      .trim();

    // Handle different markdown fence variations
    if (jsonString.includes("```")) {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonString = match[1].trim();
      }
    }

    console.log("Cleaned JSON string:", jsonString);

    // Try to parse as JSON
    const parsed = JSON.parse(jsonString);
    console.log("Successfully parsed JSON:", parsed);

    // Validate and assign values
    Object.keys(enrichedData).forEach((key) => {
      if (
        parsed[key] &&
        typeof parsed[key] === "string" &&
        parsed[key].trim() &&
        parsed[key] !== "N/A" &&
        parsed[key] !== "Not available"
      ) {
        enrichedData[key] = parsed[key].trim();
      }
    });
  } catch (jsonError) {
    console.error("Error parsing JSON response:", jsonError);
    console.log("Raw response text:", text);

    // Fallback: try to extract data from text format
    const lines = text.split("\n").filter((line) => line.trim());

    lines.forEach((line) => {
      const [key, ...valueParts] = line.split(":");
      const value = valueParts.join(":").trim();

      if (key && value) {
        const cleanKey = key
          .trim()
          .toLowerCase()
          .replace(/[^a-z_]/g, "_");
        const cleanValue = value.trim();

        if (
          cleanValue &&
          cleanValue !== "N/A" &&
          cleanValue !== "Not available"
        ) {
          switch (cleanKey) {
            case "company_name":
            case "name":
              enrichedData.company_name = cleanValue;
              break;
            case "location":
            case "headquarters":
              enrichedData.location = cleanValue;
              break;
            case "industry":
              enrichedData.industry = cleanValue;
              break;
            case "number_of_employees":
            case "employees":
            case "company_size":
            case "size":
              enrichedData.number_of_employees = cleanValue;
              break;
            case "website":
            case "website_url":
              enrichedData.website = cleanValue;
              break;
          }
        }
      }
    });
  }

  return enrichedData;
}
