import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request) {
  try {
    const { name, email, message } = await request.json();

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Check if Resend is configured
    if (!resend) {
      console.log('Resend not configured, skipping email send');
      return NextResponse.json(
        { message: 'Message received (email service not configured)' },
        { status: 200 }
      );
    }

    // Send email using Resend
    try {
      const { data, error } = await resend.emails.send({
        from: 'DCLense Contact Form <onboarding@resend.dev>',
        to: ['leutrim@dcodinglabs.com'],
        subject: `New Contact Form Message from ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
              New Contact Form Submission
            </h2>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 10px 0;"><strong>Name:</strong> ${name}</p>
              <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 10px 0;"><strong>Message:</strong></p>
              <div style="background-color: white; padding: 15px; border-radius: 4px; border-left: 4px solid #2563eb;">
                ${message.replace(/\n/g, '<br>')}
              </div>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="color: #64748b; font-size: 12px; text-align: center;">
              This message was sent from the DCLense contact form.
            </p>
          </div>
        `,
        text: `
New Contact Form Submission

Name: ${name}
Email: ${email}
Message: ${message}

This message was sent from the DCLense contact form.
        `.trim()
      });

      if (error) {
        console.error('Resend error:', error);
        return NextResponse.json(
          { message: 'Failed to send email. Please try again.' },
          { status: 500 }
        );
      }

      console.log('Email sent successfully:', data);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return NextResponse.json(
        { message: 'Failed to send email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Message sent successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}