import nodemailer from 'nodemailer';

type SendPasswordResetEmailParams = {
  to: string;
  resetUrl: string;
};

type SendActivityNotificationEmailParams = {
  to: string;
  title: string;
  text: string;
  href: string;
};

const getRequiredEnv = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required to send email.`);
  }

  return value;
};

const createTransport = () => nodemailer.createTransport({
  host: getRequiredEnv('SMTP_HOST'),
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: getRequiredEnv('SMTP_USER'),
    pass: getRequiredEnv('SMTP_PASS'),
  },
});

export const isMailConfigured = () => {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM);
};

export const sendPasswordResetEmail = async ({ to, resetUrl }: SendPasswordResetEmailParams) => {
  const appName = process.env.APP_NAME || 'Название';
  const from = getRequiredEnv('MAIL_FROM');

  await createTransport().sendMail({
    from,
    to,
    subject: `Восстановление пароля ${appName}`,
    text: [
      `Вы запросили восстановление пароля в ${appName}.`,
      '',
      'Перейдите по ссылке, чтобы задать новый пароль:',
      resetUrl,
      '',
      'Ссылка действует 30 минут. Если вы не запрашивали восстановление, просто проигнорируйте это письмо.',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h2 style="margin:0 0 16px">Восстановление пароля ${appName}</h2>
        <p>Вы запросили восстановление пароля.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#111;color:#fff;text-decoration:none">
            Задать новый пароль
          </a>
        </p>
        <p style="color:#555">Ссылка действует 30 минут. Если вы не запрашивали восстановление, просто проигнорируйте это письмо.</p>
      </div>
    `,
  });
};

export const sendActivityNotificationEmail = async ({ to, title, text, href }: SendActivityNotificationEmailParams) => {
  const appName = process.env.APP_NAME || 'ArtSide';
  const appUrl = process.env.APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  const url = `${appUrl}${href}`;

  await createTransport().sendMail({
    from: getRequiredEnv('MAIL_FROM'),
    to,
    subject: `${title} - ${appName}`,
    text: [text, '', url].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h2 style="margin:0 0 16px">${title}</h2>
        <p>${text}</p>
        <p>
          <a href="${url}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#111;color:#fff;text-decoration:none">
            Открыть работу
          </a>
        </p>
      </div>
    `,
  });
};
