import { createAdminClient } from 'npm:@insforge/sdk';

const STATUSES = ['Applied','Screening','HR Interview','Technical Interview','Offer','Accepted','Rejected','Withdrawn','Ghosted'] as const;

const STOPWORDS = new Set(['pt','cv','tbk','ltd','inc','co','the','dan','dll']);

function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .join(' ');
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export default async function (req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });

  const secret = Deno.env.get('N8N_INGEST_SECRET') ?? '';
  if (req.headers.get('x-ingest-secret') !== secret || !secret) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const admin = createAdminClient({
    baseUrl: Deno.env.get('INSFORGE_BASE_URL') ?? '',
    apiKey: Deno.env.get('API_KEY') ?? '',
  });
  const ownerId = Deno.env.get('OWNER_USER_ID') ?? '';
  const baseUrl = Deno.env.get('INSFORGE_BASE_URL') ?? '';
  const apiKey = Deno.env.get('API_KEY') ?? '';
  if (!ownerId || !baseUrl || !apiKey) {
    return json({ ok: false, error: 'server misconfigured' }, 500);
  }
  try {
  const url = new URL(req.url);
  const dryRun = url.searchParams.get('dry_run') === '1';

  if (req.method === 'GET' && url.searchParams.get('action') === 'summary') {
    const { data: apps } = await admin.database.from('job_applications')
      .select('id, company_name, role_title, current_status, task_deadline, next_follow_up_date, interview_scheduled_at')
      .eq('user_id', ownerId);
    const rows = apps ?? [];
    const by_status: Record<string, number> = {};
    for (const r of rows) by_status[r.current_status] = (by_status[r.current_status] ?? 0) + 1;
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: hist } = await admin.database.from('application_status_history')
      .select('status, changed_at, application_id, job_applications!inner(company_name, role_title, user_id)')
      .eq('job_applications.user_id', ownerId)
      .gte('changed_at', since)
      .order('changed_at', { ascending: false })
      .limit(7);
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = rows.flatMap((r) => [
      { kind: 'task_deadline', date: r.task_deadline, row: r },
      { kind: 'follow_up', date: r.next_follow_up_date, row: r },
      { kind: 'interview', date: r.interview_scheduled_at ? String(r.interview_scheduled_at).slice(0, 10) : null, row: r },
    ])
      .filter((e) => e.date && e.date >= today)
      .sort((a, b) => (a.date as string) < (b.date as string) ? -1 : 1)
      .slice(0, 5)
      .map((e) => ({ company_name: e.row.company_name, role_title: e.row.role_title, kind: e.kind, date: e.date }));
    return json({
      ok: true,
      by_status,
      changed_24h: (hist ?? []).map((h: { status: string; changed_at: string; job_applications: { company_name: string; role_title: string } }) => ({
        company_name: h.job_applications.company_name, role_title: h.job_applications.role_title,
        status: h.status, changed_at: h.changed_at,
      })),
      upcoming,
    });
  }

  if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405);

  const body = await req.json().catch(() => ({}));
  const company = String(body.company ?? '').trim();
  const role = String(body.role ?? '').trim();
  if (!company || !role) return json({ ok: false, error: 'company dan role wajib' }, 400);
  // ponytail: explicit null status (unmapped portal status) → needs_review, no writes
  if ('status' in body && (body.status === null || body.status === undefined)) {
    let candidates: Array<{ id: string; company_name: string; role_title: string; current_status: string }> = [];
    const jobUrlNull = String(body.job_url ?? '').trim();
    let matchedId: string | null = null;
    if (jobUrlNull) {
      const { data } = await admin.database.from('job_applications')
        .select('id, current_status').eq('user_id', ownerId).eq('job_url', jobUrlNull).limit(1);
      if (data?.length) matchedId = data[0].id;
    }
    if (!matchedId) {
      const first = normalize(company).split(' ')[0] ?? '';
      const { data } = await admin.database.from('job_applications')
        .select('id, company_name, role_title, current_status')
        .eq('user_id', ownerId)
        .ilike('company_name', `%${first}%`)
        .limit(10);
      candidates = (data ?? []).filter((r) => normalize(r.company_name) === normalize(company));
    }
    return json({ ok: true, action: 'needs_review', candidates, reason: 'status tak dikenal: ' + (body.portal_status ?? '') });
  }
  const status = String(body.status ?? 'Applied').trim();
  const sourceName = String(body.source ?? '').trim();
  const jobUrl = String(body.job_url ?? '').trim();
  const notes = String(body.notes ?? '').trim();
  if (!company || !role) return json({ ok: false, error: 'company dan role wajib' }, 400);
  if (!(STATUSES as readonly string[]).includes(status)) {
    return json({ ok: false, error: `status tak dikenal: ${status}` }, 400);
  }

  // 1. match job_url persis
  let appId: string | null = null;
  let prevStatus: string | null = null;
  if (jobUrl) {
    const { data } = await admin.database.from('job_applications')
      .select('id, current_status').eq('user_id', ownerId).eq('job_url', jobUrl).limit(1);
    if (data?.length) { appId = data[0].id; prevStatus = data[0].current_status; }
  }
  // 2. match normalisasi company (+ role mengandung)
  let candidates: Array<{ id: string; company_name: string; role_title: string; current_status: string }> = [];
  if (!appId) {
    const first = normalize(company).split(' ')[0] ?? '';
    const { data } = await admin.database.from('job_applications')
      .select('id, company_name, role_title, current_status')
      .eq('user_id', ownerId)
      .ilike('company_name', `%${first}%`)
      .limit(10);
    candidates = (data ?? []).filter((r) => normalize(r.company_name) === normalize(company));
    const roleNorm = normalize(role);
    const roleHit = candidates.filter((r) => normalize(r.role_title).includes(roleNorm) || roleNorm.includes(normalize(r.role_title)));
    if (roleHit.length === 1) { appId = roleHit[0].id; prevStatus = roleHit[0].current_status; }
  }
  if (!appId && candidates.length > 0) {
    return json({ ok: true, action: 'needs_review', dry_run: dryRun || undefined, candidates });
  }

  // find-or-create source
  let sourceId: string | null = null;
  const resolvedSource = sourceName || 'Website Perusahaan';
  const { data: src } = await admin.database.from('sources')
    .select('id').eq('user_id', ownerId).eq('name', resolvedSource).limit(1);
  if (src?.length) sourceId = src[0].id;
  else if (!dryRun) {
    const { data: created } = await admin.database.from('sources')
      .insert([{ user_id: ownerId, name: resolvedSource }]).select('id');
    sourceId = created?.[0]?.id ?? null;
  }

  if (dryRun) {
    return json({ ok: true, dry_run: true, action: appId ? (prevStatus === status ? 'unchanged' : 'updated') : 'created', application_id: appId });
  }

  if (appId) {
    if (prevStatus === status) return json({ ok: true, action: 'unchanged', application_id: appId });
    await admin.database.from('job_applications').update({ current_status: status }).eq('id', appId).eq('user_id', ownerId);
    return json({ ok: true, action: 'updated', application_id: appId, prev_status: prevStatus });
  }
  const { data: inserted } = await admin.database.from('job_applications').insert([{
    user_id: ownerId, company_name: company, role_title: role, source_id: sourceId,
    current_status: status, job_url: jobUrl || null, notes: notes || null,
  }]).select('id');
  return json({ ok: true, action: 'created', application_id: inserted?.[0]?.id ?? null });
  } catch (err) {
    return json({ ok: false, error: String((err as Error)?.message ?? err) }, 500);
  }
}
