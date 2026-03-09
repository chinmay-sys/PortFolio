export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const { name, email, message } = req.body || {};
  if(!name || !email || !message) return res.status(400).send('Missing fields');

  const nodemailer = (await import('nodemailer')).default;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mail = {
    from: process.env.EMAIL_USER,
    replyTo: email,
    to: process.env.EMAIL_USER,
    subject: `Portfolio Contact from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
  };

  try{
    await transporter.sendMail(mail);
    res.status(200).send('OK');
  }catch(err){
    console.error('Mail error', err);
    res.status(500).send('Mail error: '+ (err.message || 'unknown'));
  }
}
