import { NextResponse } from "next/server";
import { Resend } from "resend";
// import { createClient } from '@supabase/supabase-js';

export const revalidate = 0;

const resend = new Resend(process.env.RESEND_API_KEY);
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for cron jobs
// );
const supabase = null;

export async function GET(request) {
  try {
    // Get today's date in Kosovo timezone (CET/CEST)
    const kosovoDate = new Date().toLocaleDateString("en-CA", {
      timeZone: "Europe/Belgrade", // Kosovo uses same timezone as Belgrade
    });

    console.log("Checking reminders for date:", kosovoDate);

    // Get all representatives with reminder_date = today
    const { data: representatives, error } = { data: [], error: null };

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    console.log(
      `Found ${representatives?.length || 0} representatives with reminders for today`
    );

    if (!representatives || representatives.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No reminders found for today",
      });
    }

    // Group representatives by assigned user
    const userReminders = {};
    representatives.forEach((rep) => {
      const userId = rep.assigned_user.id;
      if (!userReminders[userId]) {
        userReminders[userId] = {
          user: rep.assigned_user,
          representatives: [],
        };
      }
      userReminders[userId].representatives.push(rep);
    });

    console.log(
      `Sending reminders to ${Object.keys(userReminders).length} users`
    );

    // Send emails to each user
    const emailResults = [];
    for (const { user, representatives } of Object.values(userReminders)) {
      try {
        const emailHtml = generateReminderEmail(user, representatives);

        const result = await resend.emails.send({
          from: "DCLense Reminders <onboarding@resend.dev>",
          to: [user.email],
          subject: `Daily Reminders - ${representatives.length} representative${representatives.length > 1 ? "s" : ""} to follow up`,
          html: emailHtml,
        });

        emailResults.push({
          user: user.email,
          success: true,
          id: result.data?.id,
        });
        console.log(`Email sent successfully to ${user.email}`);
      } catch (emailError) {
        console.error(`Failed to send email to ${user.email}:`, emailError);
        emailResults.push({
          user: user.email,
          success: false,
          error: emailError.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed reminders for ${representatives.length} representatives`,
      emailResults,
      date: kosovoDate,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

function generateReminderEmail(user, representatives) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://dclense1.vercel.app";
  const today = new Date().toLocaleDateString("en-US", {
    timeZone: "Europe/Belgrade",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Daily Reminders - DCLense</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">DCLense</h1>
          <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Daily Reminders</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 10px 0; font-size: 24px;">Good morning, ${user.first_name}!</h2>
          <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
            Today is ${today}. You have ${representatives.length} representative${representatives.length > 1 ? "s" : ""} to follow up with:
          </p>
          
          <!-- Representatives List -->
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            ${representatives
              .map(
                (rep, index) => `
              <div style="border-bottom: ${index < representatives.length - 1 ? "1px solid #e5e7eb" : "none"}; padding: ${index > 0 ? "20px 0" : "0 0 20px 0"}; margin-bottom: ${index < representatives.length - 1 ? "20px" : "0"};">
                <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap;">
                  <div style="flex: 1; min-width: 250px;">
                    <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 18px; font-weight: 600;">
                      ${rep.first_name} ${rep.last_name}
                    </h3>
                    ${rep.role ? `<p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;"><strong>Role:</strong> ${rep.role}</p>` : ""}
                    ${rep.company?.company_name ? `<p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;"><strong>Company:</strong> ${rep.company.company_name}</p>` : ""}
                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Reminder Date:</strong> ${new Date(rep.reminder_date).toLocaleDateString()}</p>
                    ${rep.notes ? `<p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; font-style: italic;">"${rep.notes}"</p>` : ""}
                  </div>
                  <div style="margin-top: 10px;">
                    <a href="${baseUrl}/dashboard?repId=${rep.id}" 
                       style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; transition: background-color 0.2s;">
                      View Representative
                    </a>
                  </div>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
          
          <!-- Action Buttons -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/dashboard" 
               style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 0 10px 10px 0;">
              📊 View Dashboard
            </a>
            <a href="${baseUrl}/reminders" 
               style="display: inline-block; background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 0 0 10px 0;">
              🔔 Manage Reminders
            </a>
          </div>

          <!-- Tips -->
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
              <strong>💡 Tip:</strong> Click on "View Representative" to see full details and update their status after your follow-up.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
            This is an automated reminder from <strong>DCLense</strong>
          </p>
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            You're receiving this because you have representatives assigned to you with reminder dates.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
