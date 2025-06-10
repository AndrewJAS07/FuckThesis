import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  try {
    const { amount } = await req.json();
    const token = req.headers.get('authorization')?.split(' ')[1];

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const userId = decoded.userId;

    // Get current wallet balance
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('wallet_balance')
      .eq('id', userId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Update wallet balance
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ wallet_balance: user.wallet_balance + amount })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      message: 'Top-up successful',
      newBalance: updatedUser.wallet_balance
    });
  } catch (error) {
    console.error('Top-up error:', error);
    return NextResponse.json(
      { error: 'Error processing top-up' },
      { status: 500 }
    );
  }
}