'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InventoryItem, computeStatus, formatQty } from '@/lib/inventory-data';

export function StockCard({ item, onAdjust }: { item: InventoryItem; onAdjust: (delta: number) => void }) {
  const status = computeStatus(item);
  const border =
    status === 'out' ? 'border-destructive' : status === 'low' ? 'border-yellow-500' : 'border-border';

  return (
    <Card className={`overflow-hidden border ${border}`}>
      <CardContent className="grid gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{item.name}</div>
            <div className="text-xs text-muted-foreground">{item.category} • Loc {item.location}</div>
          </div>
          <div>
            {status === 'out' && <Badge variant="destructive">Out of Stock</Badge>}
            {status === 'low' && <Badge className="bg-yellow-500/15 text-yellow-600">Low Stock</Badge>}
            {status === 'ok' && <Badge variant="secondary">OK</Badge>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-md border px-3 py-2">
            <div className="text-xs text-muted-foreground">On Hand</div>
            <div className="text-lg font-bold">{formatQty(item.qty, item.unit)}</div>
          </div>
          <div className="rounded-md border px-3 py-2">
            <div className="text-xs text-muted-foreground">Min Level</div>
            <div className="text-sm font-semibold">{formatQty(item.minLevel, item.unit)}</div>
          </div>
          <div className="ml-auto text-xs text-muted-foreground">Updated {new Date(item.updatedAt).toLocaleString()}</div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onAdjust(-1)}>-1</Button>
          <Button variant="outline" size="sm" onClick={() => onAdjust(+1)}>+1</Button>
          <Button variant="secondary" size="sm" onClick={() => onAdjust(+5)}>+5</Button>
        </div>
      </CardContent>
    </Card>
  );
}
