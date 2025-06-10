import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  try {
    const { pickup, destination, fare } = await req.json();
    const token = req.headers.get('authorization')?.split(' ')[1];

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const userId = decoded.userId;

    // Check user's wallet balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('wallet_balance')
      .eq('id', userId)
      .single();

    if (userError) {
      throw userError;
    }

    if (user.wallet_balance < fare) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Create ride request
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .insert([
        {
          user_id: userId,
          pickup,
          destination,
          fare,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (rideError) {
      throw rideError;
    }

    // Deduct fare from user's wallet
    const { error: updateError } = await supabase
      .from('users')
      .update({ wallet_balance: user.wallet_balance - fare })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      message: 'Ride booked successfully',
      ride
    });
  } catch (error) {
    console.error('Booking error:', error);
    return NextResponse.json(
      { error: 'Error booking ride' },
      { status: 500 }
    );
  }
}