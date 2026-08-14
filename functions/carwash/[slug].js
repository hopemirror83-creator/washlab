const MAX_SLUG_BYTES = 240;

export async function onRequest(context) {
  const parameter = context.params.slug;
  const slug = Array.isArray(parameter) ? parameter.join('/') : String(parameter || '');

  if (new TextEncoder().encode(slug).length <= MAX_SLUG_BYTES) {
    return context.next();
  }

  const prefix = slug.split('-').slice(0, 2).join('-') || 'carwash';
  const input = new TextEncoder().encode(slug);
  const hash = await crypto.subtle.digest('SHA-256', input);
  const digest = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
  const destination = new URL(context.request.url);
  destination.pathname = `/carwash/${prefix}-carwash-${digest}/`;

  return Response.redirect(destination.toString(), 301);
}
