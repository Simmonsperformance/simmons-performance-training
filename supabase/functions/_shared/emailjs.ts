export class EmailJsError extends Error {
  status: number | null;
  responseText: string;

  constructor(message: string, status: number | null, responseText: string) {
    super(message);
    this.name = 'EmailJsError';
    this.status = status;
    this.responseText = responseText;
  }
}

export async function sendEmailJs(
  templateId: string,
  templateParams: Record<string, unknown>,
): Promise<void> {
  const serviceId = Deno.env.get('EMAILJS_SERVICE_ID');
  const publicKey = Deno.env.get('EMAILJS_PUBLIC_KEY');
  const siteUrl = Deno.env.get('SPT_PUBLIC_SITE_URL');

  if (!serviceId || !publicKey || !siteUrl) {
    throw new EmailJsError('Email service configuration is incomplete.', null, '');
  }

  let response: Response;
  try {
    response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: siteUrl,
      },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: templateParams,
      }),
    });
  } catch (error) {
    throw new EmailJsError(
      error instanceof Error ? error.message : 'Email service request failed.',
      null,
      '',
    );
  }

  const responseText = await response.text();
  if (!response.ok) {
    throw new EmailJsError(
      `Email service rejected the request (${response.status}).`,
      response.status,
      responseText.slice(0, 1200),
    );
  }
}
