const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTPP_HOST,
  port: Number(process.env.SMTPP_PORT),
  secure: true, // Zoho exige TLS en puerto 465
  auth: {
    user: process.env.SMTPP_USER,
    pass: process.env.SMTPP_PASS
  }
});

// Verifica configuración al iniciar (opcional)
transporter.verify().then(() => {
  console.log('SMTP ready to send emails');
}).catch(err => {
  console.error('SMTP config error:', err);
});

async function sendEmail(to, subject, html) {
  const mailOptions = {
    from: `"CoffeeTech" <${process.env.SMTPP_USER}>`,
    to,
    subject,
    html
  };
  return transporter.sendMail(mailOptions);
}

module.exports = { sendEmail };
