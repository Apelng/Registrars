const nodemailer = require('nodemailer');

const escapeHtml = (value = '') =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

// Email template
const createEmailTemplate = (data) => `
<html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
            .header { color: #2c3e50; border-bottom: 2px solid #107b5f; padding-bottom: 10px; }
            .details { margin: 15px 0; }
            .label { font-weight: bold; color: #107b5f; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2 class="header">New Contact Us Submission</h2>
            <div class="details">
                <p><span class="label">Name:</span> ${escapeHtml(data.name)}</p>
                <p><span class="label">Email:</span> ${escapeHtml(data.email)}</p>
                <p><span class="label">Phone:</span> ${escapeHtml(data.phone)}</p>
                <p><span class="label">Message:</span><br>${escapeHtml(data.message).replace(/\n/g, '<br>')}</p>
            </div>
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
            subject: 'New Contact Us Submission',
            html: createEmailTemplate(data),
            replyTo: data.email
        });

        return respond(200, { message: 'Email sent successfully' });
    } catch (error) {
        // Visible in Netlify > Functions > send-email > logs
        console.error('sendMail failed:', error.code, error.responseCode, error.message);
        return respond(500, { error: 'Error sending email' });
    }
};
