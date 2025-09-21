"use client";
import { useEffect, useState } from 'react';

function StartButton({ orderid, itemid }: { orderid: number; itemid: number }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch('/api/kitchen-agents/item/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderid, itemid }),
          });
        } finally {
          setBusy(false);
        }
      }}
      className="px-2 py-1 border rounded"
    >{busy ? 'Starting…' : 'Start'}</button>
  );
}

export default function Page() {
  const [recs, setRecs] = useState<any[]>([]);
  const [breaches, setBreaches] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [r1, r2, r3] = await Promise.all([
          fetch('/api/kitchen-agents/station-dispatcher?category=Food&limit=3').then(r => r.json()),
          fetch('/api/kitchen-agents/alerts/breaches').then(r => r.json()),
          fetch('/api/kitchen-agents/queue?category=Food&limit=10').then(r => r.json()),
        ]);
        if (!isMounted) return;
        setRecs(Array.isArray(r1) ? r1 : []);
        setBreaches(Array.isArray(r2) ? r2 : []);
        setQueue(Array.isArray(r3) ? r3 : []);
      } catch (e) {
        console.error(e);
      }
    };
    load();
    const id = setInterval(load, 4000);
    return () => {
      isMounted = false;
      clearInterval(id);
    };
  }, []);

  return (
    <main style={{ padding: 16, display: 'grid', gap: 16 }}>
      <section>
        <h1 style={{ fontWeight: 600 }}>Station Dispatcher (Food)</h1>
        <ul>
          {recs.map((r: any) => (
            <li key={`${r?.payload?.orderid}-${r?.payload?.itemid}`} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>{r.action}</span>
              {r.payload?.orderid && r.payload?.itemid && (
                <StartButton orderid={r.payload.orderid} itemid={r.payload.itemid} />
              )}
              <small style={{ color: '#666' }}>{r.reason}</small>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 style={{ fontWeight: 600 }}>SLA Breaches</h2>
        <ul>
          {breaches.map((b: any) => (
            <li key={`${b?.payload?.orderid}-${b?.payload?.itemid}`}>{b.action} — {b.reason}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 style={{ fontWeight: 600 }}>Queue (Food)</h2>
        <ul>
          {queue.map((q: any) => (
            <li key={`${q.orderid}-${q.itemid}`}>
              #{q.orderid} · {q.itemname} · est {q.est_prep_minutes?.toFixed?.(1) ?? '-'}m
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
