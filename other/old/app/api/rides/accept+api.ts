import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  try {
    const { rideId } = await req.json();
    const token = req.headers.get('authorization')?.split(' ')[1];

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const driverId = decoded.userId;

    // Get ride details
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .single();

    if (rideError || !ride) {
      return NextResponse.json(
        { error: 'Ride not found' },
        { status: 404 }
      );
    }

    if (ride.status !== 'pending') {
      return NextResponse.json(
        { error: 'Ride is no longer available' },
        { status: 400 }
      );
    }

    // Update ride status
    const { data: updatedRide, error: updateError } = await supabase
      .from('rides')
      .update({
        status: 'accepted',
        driver_id: driverId,
        accepted_at: new Date().toISOString()
      })
      .eq('id', rideId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      message: 'Ride accepted successfully',
      ride: updatedRide
    });
  } catch (error) {
    console.error('Acceptance error:', error);
    return NextResponse.json(
      { error: 'Error accepting ride' },
      { status: 500 }
    );
  }
}