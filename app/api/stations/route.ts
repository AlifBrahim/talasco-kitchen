import { NextRequest, NextResponse } from 'next/server';
import { GetStationsResponse } from '@shared/api';

// Mock data for now - replace with actual database queries
const mockStations: GetStationsResponse['stations'] = [
  {
    id: 'station-1',
    location_id: 'loc-1',
    name: 'Prep Station A',
    kind: 'prep',
    is_active: true,
    station_sla: [
      {
        id: 'sla-1',
        station_id: 'station-1',
        daypart: 'lunch',
        target_prep_minutes: 15,
        alert_after_minutes: 20
      },
      {
        id: 'sla-2',
        station_id: 'station-1',
        daypart: 'dinner',
        target_prep_minutes: 18,
        alert_after_minutes: 25
      }
    ]
  },
  {
    id: 'station-2',
    location_id: 'loc-1',
    name: 'Grill Station',
    kind: 'cook',
    is_active: true,
    station_sla: [
      {
        id: 'sla-3',
        station_id: 'station-2',
        daypart: 'lunch',
        target_prep_minutes: 12,
        alert_after_minutes: 18
      }
    ]
  },
  {
    id: 'station-3',
    location_id: 'loc-1',
    name: 'Expedite Station',
    kind: 'expedite',
    is_active: true,
    station_sla: [
      {
        id: 'sla-4',
        station_id: 'station-3',
        daypart: 'lunch',
        target_prep_minutes: 5,
        alert_after_minutes: 8
      }
    ]
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location_id = searchParams.get('location_id');
    const kind = searchParams.get('kind');
    const active = searchParams.get('active');

    let filteredStations = mockStations;

    if (location_id) {
      filteredStations = filteredStations.filter(station => station.location_id === location_id);
    }

    if (kind) {
      filteredStations = filteredStations.filter(station => station.kind === kind);
    }

    if (active !== null) {
      const isActive = active === 'true';
      filteredStations = filteredStations.filter(station => station.is_active === isActive);
    }

    const response: GetStationsResponse = {
      stations: filteredStations
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching stations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stations' },
      { status: 500 }
    );
  }
}
