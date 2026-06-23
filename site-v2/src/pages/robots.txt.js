const isStaging = import.meta.env.PUBLIC_VIVIEN_BUILD_TARGET === 'staging' || import.meta.env.VIVIEN_BUILD_TARGET === 'staging';

export async function GET() {
  const body = isStaging
    ? 'User-agent: *\nDisallow: /\n'
    : 'User-agent: *\nAllow: /\nSitemap: https://vivien.lv/sitemap.xml\n';
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}
