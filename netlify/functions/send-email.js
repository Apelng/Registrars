const nodemailer = require('nodemailer');

const escapeHtml = (value = '') =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

// Notification email that arrives in the registrars inbox
const createEmailTemplate = (data) => {
    const name = escapeHtml(data.name || 'Not provided');
    const email = escapeHtml(data.email);
    const phone = escapeHtml(data.phone || 'Not provided');
    const message = escapeHtml(data.message).replace(/\n/g, '<br>');
    const received = new Date().toLocaleString('en-GB', {
        timeZone: 'Africa/Lagos',
        dateStyle: 'full',
        timeStyle: 'short'
    });
    const row = (label, value) => `
        <tr>
            <td style="padding:10px 0;width:90px;vertical-align:top;font-size:13px;color:#6b7280;">${label}</td>
            <td style="padding:10px 0;font-size:15px;color:#111827;font-weight:600;">${value}</td>
        </tr>`;

    return `
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
        <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
                <tr>
                    <td style="background:#107b5f;padding:22px 28px;">
                        <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#d1fae5;">Apel Registrars &middot; Website</div>
                        <div style="font-size:21px;font-weight:bold;color:#ffffff;margin-top:4px;">New Contact Us Message</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:24px 28px 8px;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e5e7eb;">
                            ${row('Name', name)}
                            ${row('Email', `<a href="mailto:${email}" style="color:#107b5f;text-decoration:none;">${email}</a>`)}
                            ${row('Phone', phone)}
                            ${row('Received', `<span style="font-weight:normal;">${escapeHtml(received)} (WAT)</span>`)}
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 28px 8px;">
                        <div style="font-size:13px;color:#6b7280;margin-bottom:8px;">Message</div>
                        <div style="background:#f9fafb;border-left:4px solid #107b5f;border-radius:4px;padding:14px 16px;font-size:15px;line-height:1.6;color:#111827;">${message}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:20px 28px 28px;">
                        <a href="mailto:${email}?subject=Re:%20Your%20message%20to%20Apel%20Registrars" style="display:inline-block;background:#107b5f;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 22px;border-radius:8px;">Reply to ${name}</a>
                        <div style="font-size:12px;color:#9ca3af;margin-top:14px;">The sender has been sent an automatic confirmation promising a reply within 24 hours on business days.</div>
                    </td>
                </tr>
            </table>
        </td></tr>
    </table>
</body>
</html>
`;
};

// Confirmation email sent to the person who submitted the form
const createConfirmationTemplate = (data) => `
<html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
            .header { color: #2c3e50; border-bottom: 2px solid #107b5f; padding-bottom: 10px; }
            .quote { margin: 15px 0; padding: 10px 15px; background: #f5f5f5; border-left: 3px solid #107b5f; }
            .footer { margin-top: 25px; font-size: 13px; color: #777; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2 class="header">We have received your message</h2>
            <p>Dear ${escapeHtml(data.name || 'Valued Shareholder')},</p>
            <p>Thank you for contacting Apel Registrars. This is to confirm that your message has been received.</p>
            <p>Our team will review it and reply to you within <strong>24 hours on business days</strong> (Monday &ndash; Friday).</p>
            <p>For your records, this is what you sent:</p>
            <div class="quote">${escapeHtml(data.message).replace(/\n/g, '<br>')}</div>
            <p>Kind regards,<br><strong>Apel Registrars</strong><br>
            6 Alhaji Bashorun Street, Off Norman Williams Crescent, South-West Ikoyi, Lagos<br>
            +234 704 612 6698 | registrars@apel.ng</p>
            <p class="footer">This is an automated message. Please do not reply to this email. If your enquiry is urgent, contact us at registrars@apel.ng.</p>
        </div>
    </body>
</html>
`;

const respond = (statusCode, body) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
});

exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return respond(405, { error: 'Method Not Allowed' });
    }

    const { EMAIL_USER, EMAIL_PASS } = process.env;
    if (!EMAIL_USER || !EMAIL_PASS) {
        console.error('Missing EMAIL_USER or EMAIL_PASS environment variable');
        return respond(500, { error: 'Email service is not configured' });
    }

    let data;
    try {
        data = JSON.parse(event.body || '{}');
    } catch (err) {
        return respond(400, { error: 'Invalid JSON body' });
    }

    // Validate required fields
    if (!data.email || !data.message) {
        return respond(400, { error: 'Email and message are required fields' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) {
        return respond(400, { error: 'Please provide a valid email address' });
    }

    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: { user: EMAIL_USER, pass: EMAIL_PASS }
        });

        await transporter.sendMail({
            from: `"Contact Us" <${EMAIL_USER}>`,
            to: 'registrars@apel.ng',
            subject: `New Contact Us Message from ${String(data.name || data.email).replace(/[\r\n]+/g, ' ')}`,
            html: createEmailTemplate(data),
            replyTo: data.email
        });

        // Confirmation to the sender. A failure here must not make the
        // submission look failed, since the team has already received it.
        try {
            await transporter.sendMail({
                from: `"Apel Registrars" <${EMAIL_USER}>`,
                to: data.email,
                replyTo: 'registrars@apel.ng',
                subject: 'We have received your message - Apel Registrars',
                html: createConfirmationTemplate(data)
            });
        } catch (confirmError) {
            console.error('confirmation email failed:', confirmError.code, confirmError.message);
        }

        return respond(200, { message: 'Email sent successfully' });
    } catch (error) {
        // Visible in Netlify > Functions > send-email > logs
        console.error('sendMail failed:', error.code, error.responseCode, error.message);
        return respond(500, { error: 'Error sending email' });
    }
};
