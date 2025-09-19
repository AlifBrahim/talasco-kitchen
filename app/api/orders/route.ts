import { NextRequest, NextResponse } from 'next/server';
import {
  CreateOrderRequest,
  CreateOrderResponse,
  GetOrdersResponse,
  Order,
  OrderItem,
} from '@shared/api';
import { dbQuery } from '@server/db';
import { createOrderInDb, OrderPayloadError } from '@api-lib/order-service';

type OrderRow = {
  id: string;
  location_id: string;
  source: Order['source'];
  table_number: string | null;
  customer_name: string | null;
  placed_at: Date;
  promised_at: Date | null;
  status: Order['status'];
};

type OrderItemRow = {
  id: string;
  order_id: string;
  menu_item_id: string;
  qty: number;
  notes: string | null;
  status: OrderItem['status'];
  predicted_prep_minutes: string | number | null;
  actual_prep_seconds: number | null;
  created_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  menu_item_org_id: string;
  menu_item_sku: string | null;
  menu_item_name: string;
  menu_item_category: string | null;
  menu_item_is_active: boolean;
  menu_item_avg_prep_minutes: string | number | null;
  menu_item_created_at: Date;
};

type TicketRow = {
  id: string;
  order_item_id: string;
  station_id: string;
  sequence: number | string;
  status: string;
  priority_score: string | number | null;
  priority_reason: unknown;
  sla_minutes: number | null;
  enqueued_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
};

type OrderItemResponse = GetOrdersResponse['orders'][number]['order_items'][number];
type TicketResponse = OrderItemResponse['kds_tickets'][number];

function toIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const locationId = searchParams.get('location_id');

    const conditions: string[] = [];
    const values: unknown[] = [];

    if (statusParam) {
      const statuses = statusParam
        .split(',')
        .map((status) => status.trim())
        .filter(Boolean);
      if (statuses.length > 0) {
        conditions.push(`status = ANY($${conditions.length + 1})`);
        values.push(statuses);
      }
    }

    if (locationId) {
      conditions.push(`location_id = $${conditions.length + 1}::uuid`);
      values.push(locationId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const orderResult = await dbQuery<OrderRow>(
      `SELECT
         id::text,
         location_id::text,
         source,
         table_number,
         customer_name,
         placed_at,
         promised_at,
         status
       FROM orders
       ${whereClause}
       ORDER BY placed_at DESC
       LIMIT 200`,
      values,
    );

    if (orderResult.rowCount === 0) {
      return NextResponse.json<GetOrdersResponse>({ orders: [] });
    }

    const orderIds = orderResult.rows.map((row) => row.id);

    const orderItemsResult = await dbQuery<OrderItemRow>(
      `SELECT
         oi.id::text,
         oi.order_id::text,
         oi.menu_item_id::text,
         oi.qty,
         oi.notes,
         oi.status,
         oi.predicted_prep_minutes,
         oi.actual_prep_seconds,
         oi.created_at,
         oi.started_at,
         oi.completed_at,
         mi.org_id::text    AS menu_item_org_id,
         mi.sku             AS menu_item_sku,
         mi.name            AS menu_item_name,
         mi.category        AS menu_item_category,
         mi.is_active       AS menu_item_is_active,
         mi.avg_prep_minutes AS menu_item_avg_prep_minutes,
         mi.created_at      AS menu_item_created_at
       FROM order_items oi
       INNER JOIN menu_items mi ON mi.id = oi.menu_item_id
       WHERE oi.order_id = ANY($1::uuid[])
       ORDER BY oi.created_at ASC`,
      [orderIds],
    );

    const orderItemIds = orderItemsResult.rows.map((row) => row.id);

    const ticketResult = orderItemIds.length
      ? await dbQuery<TicketRow>(
          `SELECT
             id::text,
             order_item_id::text,
             station_id::text,
             sequence,
             status,
             priority_score,
             priority_reason,
             sla_minutes,
             enqueued_at,
             started_at,
             completed_at
           FROM kds_tickets
           WHERE order_item_id = ANY($1::uuid[])`,
          [orderItemIds],
        )
      : { rows: [] as TicketRow[] };

    const ticketsByOrderItem = new Map<string, TicketRow[]>();
    for (const ticket of ticketResult.rows) {
      const existing = ticketsByOrderItem.get(ticket.order_item_id) ?? [];
      existing.push(ticket);
      ticketsByOrderItem.set(ticket.order_item_id, existing);
    }

    const orderItemsByOrderId = new Map<string, OrderItemResponse[]>();
    function mapOrderItemRow(row: OrderItemRow): OrderItemResponse {
      return {
        id: row.id,
        order_id: row.order_id,
        menu_item_id: row.menu_item_id,
        qty: row.qty,
        notes: row.notes ?? undefined,
        status: row.status,
        predicted_prep_minutes:
          row.predicted_prep_minutes !== null ? Number(row.predicted_prep_minutes) : undefined,
        actual_prep_seconds: row.actual_prep_seconds ?? undefined,
        created_at: toIso(row.created_at)!,
        started_at: toIso(row.started_at),
        completed_at: toIso(row.completed_at),
        menu_item: {
          id: row.menu_item_id,
          org_id: row.menu_item_org_id,
          sku: row.menu_item_sku ?? undefined,
          name: row.menu_item_name,
          category: row.menu_item_category ?? undefined,
          is_active: row.menu_item_is_active,
          avg_prep_minutes:
            row.menu_item_avg_prep_minutes !== null
              ? Number(row.menu_item_avg_prep_minutes)
              : undefined,
          created_at: toIso(row.menu_item_created_at)!,
        },
        kds_tickets: (ticketsByOrderItem.get(row.id) ?? []).map<TicketResponse>((ticket) => ({
          id: ticket.id,
          order_item_id: ticket.order_item_id,
          station_id: ticket.station_id,
          sequence: typeof ticket.sequence === 'string' ? Number(ticket.sequence) : ticket.sequence,
          status: ticket.status as TicketResponse['status'],
          priority_score:
            ticket.priority_score !== null ? Number(ticket.priority_score) : undefined,
          priority_reason: ticket.priority_reason ?? undefined,
          sla_minutes: ticket.sla_minutes ?? undefined,
          enqueued_at: toIso(ticket.enqueued_at)!,
          started_at: toIso(ticket.started_at),
          completed_at: toIso(ticket.completed_at),
        })),
      } satisfies GetOrdersResponse['orders'][number]['order_items'][number];
    }

    for (const row of orderItemsResult.rows) {
      const mapped = mapOrderItemRow(row);
      const existing = orderItemsByOrderId.get(row.order_id) ?? [];
      existing.push(mapped);
      orderItemsByOrderId.set(row.order_id, existing);
    }

    const response: GetOrdersResponse = {
      orders: orderResult.rows.map((order) => ({
        id: order.id,
        location_id: order.location_id,
        source: order.source,
        table_number: order.table_number ?? undefined,
        customer_name: order.customer_name ?? undefined,
        placed_at: toIso(order.placed_at)!,
        promised_at: toIso(order.promised_at),
        status: order.status,
        order_items: orderItemsByOrderId.get(order.id) ?? [],
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderRequest = await request.json();

    if (!body.location_id || !body.source || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const response: CreateOrderResponse = await createOrderInDb(body);

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    if (error instanceof OrderPayloadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 },
    );
  }
}
