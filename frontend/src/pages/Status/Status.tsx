import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Database, Radio } from 'lucide-react';
import { PageContainer, Card, Spinner, Button } from '../../shared/components';
import { getPublicApiUrl } from '../../config/publicEnv';

interface HealthLive {
  status?: string;
  uptimeSec?: number;
  timestamp?: string;
  socketIo?: string;
}

interface HealthReady {
  status?: string;
  mongodb?: string;
  timestamp?: string;
}

export default function Status() {
  const [live, setLive] = useState<HealthLive | null>(null);
  const [ready, setReady] = useState<HealthReady | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const base = getPublicApiUrl();

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const [l, r] = await Promise.all([
        fetch(`${base}/health`).then((x) => x.json()),
        fetch(`${base}/health/ready`).then((x) => x.json()),
      ]);
      setLive(l);
      setReady(r);
    } catch {
      setErr(
        'Unable to reach the API. In dev: start the backend (port 3000) and, if you use VITE_API_URL directly, verify the URL; otherwise the /bb-api proxy is used.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <PageContainer maxWidth="lg" className="relative py-10">
      <div className="mb-8">
        <div className="bb-kicker mb-2">
          <Activity className="h-3.5 w-3.5" aria-hidden />
          Status
        </div>
        <h1 className="bb-page-heading mb-2">Service status</h1>
        <p className="bb-body-text max-w-xl text-sm">
          HTTP <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">/health</code> and{' '}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">/health/ready</code>. Real-time chat uses
          Socket.IO on the same origin as the API (JWT in <code className="text-xs">auth</code>).
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => void load()}>
          Refresh
        </Button>
        <Link to="/">
          <Button type="button" variant="ghost">
            Home
          </Button>
        </Link>
      </div>

      {err && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {err}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <Radio className="h-4 w-4 text-emerald-500" aria-hidden />
              API (liveness)
            </div>
            <pre className="max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {JSON.stringify(live, null, 2)}
            </pre>
          </Card>
          <Card className="p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <Database className="h-4 w-4 text-primary-500" aria-hidden />
              MongoDB (readiness)
            </div>
            <pre className="max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {JSON.stringify(ready, null, 2)}
            </pre>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
