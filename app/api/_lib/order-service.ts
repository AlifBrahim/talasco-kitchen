import {
  CreateOrderRequest,
  CreateOrderResponse,
} from '@shared/api';
import { getClient } from '@server/db';

const ORDER_STATUS_DEFAULT = 'in_progress';
// Accept generic hyphenated UUIDs (v1..v8, including v7 used by some libs)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class OrderPayloadError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = 'OrderPayloadError';
  }
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

async function resolveLocationId(
  client: Awaited<ReturnType<typeof getClient>>,
  requested?: string,
): Promise<string> {
  if (isUuid(requested)) {
    return requested;
  }

  const result = await client.query<{ id: string }>(
    `SELECT id::text
       FROM locations
       ORDER BY created_at ASC
       LIMIT 1`,
  );

  if (result.rowCount === 0) {
    throw new OrderPayloadError('No locations available in the database', 500);
  }

  return result.rows[0].id;
}

export async function createOrderInDb(
  payload: CreateOrderRequest,
): Promise<CreateOrderResponse> {
  const client = await getClient();
  let transactionStarted = false;

  try {
    if (payload.items.length === 0) {
      throw new OrderPayloadError('At least one order item is required');
    }

    const invalidItem = payload.items.find((item) => !isUuid(item.menu_item_id));
    if (invalidItem) {
      throw new OrderPayloadError('Each order item must reference a valid menu item id');
    }

    const locationId = await resolveLocationId(client, payload.location_id);

    await client.query('BEGIN');
    transactionStarted = true;

    const orderResult = await client.query<{
      id: string;
      location_id: string;
      source: string;
      table_number: string | null;
      customer_name: string | null;
      placed_at: Date;
      promised_at: Date | null;
      status: string;
    }>(
      `INSERT INTO orders (location_id, source, table_number, customer_name, status)
         VALUES ($1::uuid, $2, $3, $4, $5)
         RETURNING id::text, location_id::text, source, table_number, customer_name, placed_at, promised_at, status`,
      [
        locationId,
        payload.source,
        payload.table_number ?? null,
        payload.customer_name ?? null,
        ORDER_STATUS_DEFAULT,
      ],
    );

    const order = orderResult.rows[0];
    const createdItems: CreateOrderResponse['order_items'] = [];

    for (const item of payload.items) {
      const orderItemResult = await client.query<{
        id: string;
        order_id: string;
        menu_item_id: string;
        qty: number;
        notes: string | null;
        status: string;
        predicted_prep_minutes: string | number | null;
        actual_prep_seconds: number | null;
        created_at: Date;
        started_at: Date | null;
        completed_at: Date | null;
      }>(
        `INSERT INTO order_items (order_id, menu_item_id, qty, notes)
           VALUES ($1::uuid, $2::uuid, $3, $4)
           RETURNING
             id::text,
             order_id::text,
             menu_item_id::text,
             qty,
             notes,
             status,
             predicted_prep_minutes,
             actual_prep_seconds,
             created_at,
             started_at,
             completed_at`,
        [order.id, item.menu_item_id, item.qty, item.notes ?? null],
      );

      const orderItem = orderItemResult.rows[0];

      createdItems.push({
        id: orderItem.id,
        order_id: orderItem.order_id,
        menu_item_id: orderItem.menu_item_id,
        qty: orderItem.qty,
        notes: orderItem.notes ?? undefined,
        status: orderItem.status as CreateOrderResponse['order_items'][number]['status'],
        predicted_prep_minutes:
          orderItem.predicted_prep_minutes !== null
            ? Number(orderItem.predicted_prep_minutes)
            : undefined,
        actual_prep_seconds: orderItem.actual_prep_seconds ?? undefined,
        created_at: toIso(orderItem.created_at)!,
        started_at: toIso(orderItem.started_at),
        completed_at: toIso(orderItem.completed_at),
      });

      const routeResult = await client.query<{
        station_id: string;
        sequence: number | string | null;
      }>(
        `SELECT station_id::text, sequence
           FROM item_station_route
           WHERE menu_item_id = $1::uuid
           ORDER BY sequence ASC
           LIMIT 1`,
        [orderItem.menu_item_id],
      );

      const route = routeResult.rows[0];
      if (route?.station_id) {
        const sequenceValue = route.sequence ?? 1;
        await client.query(
          `INSERT INTO kds_tickets (order_item_id, station_id, sequence, status)
             VALUES ($1::uuid, $2::uuid, $3, 'queued')`,
          [orderItem.id, route.station_id, Number(sequenceValue) || 1],
        );
      }
    }

    await client.query('COMMIT');

    return {
      order: {
        id: order.id,
        location_id: order.location_id,
        source: order.source as CreateOrderResponse['order']['source'],
        table_number: order.table_number ?? undefined,
        customer_name: order.customer_name ?? undefined,
        placed_at: toIso(order.placed_at)!,
        promised_at: toIso(order.promised_at),
        status: order.status as CreateOrderResponse['order']['status'],
      },
      order_items: createdItems,
    };
  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    client.release();
  }
}
