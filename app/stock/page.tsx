'use client';

import { useMemo, useState } from 'react';
import { Plus, Search, RefreshCw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { InventoryItem, CATEGORIES, seedInventory, formatQty, computeStatus } from '@/lib/inventory-data';
import { StockCard } from '@/components/inventory/stock-card';

type StatusFilter = 'all' | 'ok' | 'low' | 'out';

export default function StockPage() {
  const [items, setItems] = useState<InventoryItem[]>(seedInventory);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');
  const [status, setStatus] = useState<StatusFilter>('all');

  const stats = useMemo(() => {
    const total = items.length;
    const low = items.filter(i => computeStatus(i) === 'low').length;
    const out = items.filter(i => computeStatus(i) === 'out').length;
    return { total, low, out };
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(i => {
      const matchesQ = q.trim().length === 0 || `${i.name} ${i.category}`.toLowerCase().includes(q.toLowerCase());
      const matchesCat = cat === 'all' || i.category === cat;
      const s = computeStatus(i);
      const matchesStatus = status === 'all' || s === status;
      return matchesQ && matchesCat && matchesStatus;
    });
  }, [items, q, cat, status]);

  function resetFilters() {
    setQ(''); setCat('all'); setStatus('all');
  }

  function upsertItem(newItem: InventoryItem) {
    setItems(prev => {
      const idx = prev.findIndex(x => x.id === newItem.id);
      if (idx === -1) return [newItem, ...prev];
      const next = [...prev];
      next[idx] = newItem;
      return next;
    });
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Kitchen Stock Management</h1>
        <p className="text-sm text-muted-foreground">Track and manage your kitchen inventory</p>
      </header>

      {/* Top stats */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard title="Total Items" value={stats.total} hint="In inventory" />
        <StatCard title="Low Stock" value={stats.low} hint="Need restocking" tone="warn" />
        <StatCard title="Out of Stock" value={stats.out} hint="Urgent restocking" tone="danger" />
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <AddItemDialog onSave={upsertItem} />
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search items..."
            className="pl-8 w-64"
          />
        </div>

        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{cap(c)}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v: StatusFilter) => setStatus(v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Items" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="ok">OK</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" className="ml-auto gap-2" onClick={resetFilters}>
          <RefreshCw className="h-4 w-4" /> Reset
        </Button>
      </div>

      <Separator className="mb-4" />

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(item => (
          <StockCard
            key={item.id}
            item={item}
            onAdjust={(delta) => {
              const next = { ...item, qty: Math.max(0, item.qty + delta), updatedAt: new Date().toISOString() };
              upsertItem(next);
            }}
          />
        ))}
        {filtered.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-6 text-sm text-muted-foreground">No items match your filters.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatCard(props: { title: string; value: number; hint: string; tone?: 'warn' | 'danger' }) {
  const tone =
    props.tone === 'danger'
      ? 'border-destructive/40 bg-destructive/5'
      : props.tone === 'warn'
      ? 'border-yellow-500/40 bg-yellow-500/5'
      : 'border-border bg-card';
  const icon =
    props.tone ? <TriangleAlert className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-primary" />;
  return (
    <Card className={`border ${tone}`}>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <div className="text-xs text-muted-foreground">{props.title}</div>
          <div className="text-2xl font-bold">{props.value}</div>
          <div className="text-xs text-muted-foreground">{props.hint}</div>
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}

function AddItemDialog({ onSave }: { onSave: (i: InventoryItem) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<InventoryItem>({
    id: crypto.randomUUID(),
    name: '',
    category: 'vegetables',
    qty: 0,
    unit: 'kg',
    minLevel: 1,
    location: 'L1',
    updatedAt: new Date().toISOString()
  });

  function save() {
    if (!draft.name.trim()) return;
    onSave(draft);
    setOpen(false);
    setDraft({ ...draft, id: crypto.randomUUID(), name: '', qty: 0 });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Add New Item</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm">
            <span>Name</span>
            <Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">
              <span>Quantity</span>
              <Input type="number" value={draft.qty} onChange={e => setDraft({ ...draft, qty: Number(e.target.value) })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Unit</span>
              <Input value={draft.unit} onChange={e => setDraft({ ...draft, unit: e.target.value })} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">
              <span>Min Level</span>
              <Input type="number" value={draft.minLevel} onChange={e => setDraft({ ...draft, minLevel: Number(e.target.value) })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Location</span>
              <Input value={draft.location} onChange={e => setDraft({ ...draft, location: e.target.value })} />
            </label>
          </div>

          <label className="grid gap-1 text-sm">
            <span>Category</span>
            <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v as any })}>
              <SelectTrigger><SelectValue placeholder="Pick category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{cap(c)}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
