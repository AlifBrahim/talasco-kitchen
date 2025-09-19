import { NextRequest, NextResponse } from 'next/server';
import {
  OrderItem,
  UpdateOrderItemStatusRequest,
  UpdateOrderItemStatusResponse,
} from '@shared/api';
import { dbQuery } from '@server/db';

function mapOrderStatusToTicket(status: OrderItem['status']): 'queued' | 'firing' | 'prepping' | 'ready' | 'passed' | 'cancelled' {
  switch (status) {
    case 'served':
      return 'ready';
    case 'passed':
      return 'passed';
    case 'cancelled':
      return 'cancelled';
    case 'queued':
    case 'firing':
    case 'prepping':
    default:
      return status;
  }
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string; itemId: string } },
) {
  try {
    const body: UpdateOrderItemStatusRequest = await request.json();
    const { orderId, itemId } = params;

    if (!body.status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 },
      );
    }

    const result = await dbQuery<{
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
    }>(
      `UPDATE order_items
         SET status = $1,
             started_at = CASE
               WHEN $1 IN ('firing', 'prepping') AND started_at IS NULL THEN NOW()
               ELSE started_at
             END,
             completed_at = CASE
               WHEN $1 IN ('served', 'cancelled', 'passed') THEN NOW()
               ELSE completed_at
             END
       WHERE id = $2::uuid AND order_id = $3::uuid
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
      [body.status, itemId, orderId],
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Order item not found' },
        { status: 404 },
      );
    }

    const orderItem = result.rows[0];

    if (body.station_id) {
      const ticketStatus = mapOrderStatusToTicket(body.status);
      await dbQuery(
        `UPDATE kds_tickets
           SET status = $1,
               started_at = CASE
                 WHEN $1 IN ('firing', 'prepping') AND started_at IS NULL THEN NOW()
                 ELSE started_at
               END,
               completed_at = CASE
                 WHEN $1 IN ('ready', 'passed', 'cancelled') THEN NOW()
                 ELSE completed_at
               END
         WHERE order_item_id = $2::uuid
           AND station_id = $3::uuid`,
        [ticketStatus, itemId, body.station_id],
      );
    }

    const response: UpdateOrderItemStatusResponse = {
      success: true,
      order_item: {
        id: orderItem.id,
        order_id: orderItem.order_id,
        menu_item_id: orderItem.menu_item_id,
        qty: orderItem.qty,
        notes: orderItem.notes ?? undefined,
        status: orderItem.status,
        predicted_prep_minutes:
          orderItem.predicted_prep_minutes !== null
            ? Number(orderItem.predicted_prep_minutes)
            : undefined,
        actual_prep_seconds: orderItem.actual_prep_seconds ?? undefined,
        created_at: toIso(orderItem.created_at)!,
        started_at: toIso(orderItem.started_at),
        completed_at: toIso(orderItem.completed_at),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating order item status:', error);
    return NextResponse.json(
      { error: 'Failed to update order item status' },
      { status: 500 },
    );
  }
}
