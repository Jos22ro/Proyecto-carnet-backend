import dotenv from 'dotenv';
dotenv.config();

const testMail = async () => {
    // Dynamic import to ensure dotenv is loaded first
    const { mailer } = await import('./utils/sendMail.js');

    console.log('📧 Testing email configuration...');
    console.log(`User: ${process.env.MAIL_USER}`);

    try {
        const info = await mailer.sendMail({
            from: process.env.MAIL_USER,
            to: process.env.MAIL_USER, // Send to self to test
            subject: "🧪 Test Email from Carnet Manager",
            text: "This is a test email to verify correct configuration.",
        });

        console.log("✅ Email sent successfully!");
        console.log("Message ID:", info.messageId);
    } catch (error: any) {
        console.error("❌ Error sending email:", error);
        if (error.response) {
            console.error("SMTP Response:", error.response);
        }
    }
};

testMail();
