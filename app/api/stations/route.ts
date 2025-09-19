import { NextRequest, NextResponse } from 'next/server';
import { GetStationsResponse, StationSLA } from '@shared/api';
import { dbQuery } from '@server/db';

type StationRow = {
  id: string;
  location_id: string;
  name: string;
  kind: GetStationsResponse['stations'][number]['kind'];
  is_active: boolean;
};

type StationSlaRow = {
  id: string;
  station_id: string;
  daypart: string;
  target_prep_minutes: number;
  alert_after_minutes: number;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('location_id');
    const kind = searchParams.get('kind');
    const active = searchParams.get('active');

    const conditions: string[] = [];
    const values: unknown[] = [];

    if (locationId) {
      conditions.push(`location_id = $${conditions.length + 1}::uuid`);
      values.push(locationId);
    }

    if (kind) {
      conditions.push(`kind = $${conditions.length + 1}`);
      values.push(kind);
    }

    if (active !== null) {
      conditions.push(`is_active = $${conditions.length + 1}`);
      values.push(active === 'true');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const stationsResult = await dbQuery<StationRow>(
      `SELECT id::text, location_id::text, name, kind, is_active
       FROM stations
       ${whereClause}
       ORDER BY name ASC`,
      values,
    );

    if (stationsResult.rowCount === 0) {
      return NextResponse.json<GetStationsResponse>({ stations: [] });
    }

    const stationIds = stationsResult.rows.map((station) => station.id);

    const slaResult = await dbQuery<StationSlaRow>(
      `SELECT
         id::text,
         station_id::text,
         daypart,
         target_prep_minutes,
         alert_after_minutes
       FROM station_sla
       WHERE station_id = ANY($1::uuid[])`,
      [stationIds],
    );

    const slaByStation = new Map<string, StationSlaRow[]>();
    for (const sla of slaResult.rows) {
      const current = slaByStation.get(sla.station_id) ?? [];
      current.push(sla);
      slaByStation.set(sla.station_id, current);
    }

    const response: GetStationsResponse = {
      stations: stationsResult.rows.map((station) => ({
        id: station.id,
        location_id: station.location_id,
        name: station.name,
        kind: station.kind,
        is_active: station.is_active,
        station_sla: (slaByStation.get(station.id) ?? []).map<StationSLA>((sla) => ({
          id: sla.id,
          station_id: sla.station_id,
          daypart: sla.daypart,
          target_prep_minutes: sla.target_prep_minutes,
          alert_after_minutes: sla.alert_after_minutes,
        })),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching stations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stations' },
      { status: 500 },
    );
  }
}
