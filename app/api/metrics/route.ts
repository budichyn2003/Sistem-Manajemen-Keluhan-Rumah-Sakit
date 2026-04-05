/**
 * API Route: GET /api/metrics
 * Mengambil statistik dan metrik dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { translations } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const complaints = db.getComplaints();

    // Calculate metrics
    const totalComplaints = complaints.length;
    const avgPriority = totalComplaints > 0
      ? (complaints.reduce((sum, c) => sum + c.priorityScore, 0) / totalComplaints).toFixed(1)
      : 0;
    const pendingReview = complaints.filter((c) => c.status === 'new' || c.status === 'reviewing').length;

    // Insurance distribution
    const insuranceDistribution: Record<string, number> = {};
    complaints.forEach((complaint) => {
      const insurance = complaint.insuranceProvider || 'umum';
      insuranceDistribution[insurance] = (insuranceDistribution[insurance] || 0) + 1;
    });

    // Get trend data (last 7 days)
    const trendData = getTrendData(complaints);

    return NextResponse.json(
      {
        success: true,
        data: {
          totalComplaints,
          avgPriority,
          pendingReview,
          insuranceDistribution,
          trendData,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error fetching metrics:', error);
    return NextResponse.json(
      { success: false, error: translations.errors.serverError },
      { status: 500 }
    );
  }
}

/**
 * Generate trend data untuk 7 hari terakhir
 */
function getTrendData(complaints: any[]) {
  const trendMap: Record<string, number> = {};
  const today = new Date();

  // Initialize last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    trendMap[dateStr] = 0;
  }

  // Count complaints per day
  complaints.forEach((complaint) => {
    const complaintDate = new Date(complaint.createdAt).toISOString().split('T')[0];
    if (trendMap.hasOwnProperty(complaintDate)) {
      trendMap[complaintDate]++;
    }
  });

  // Format untuk chart
  return Object.entries(trendMap).map(([date, count]) => {
    const d = new Date(date);
    return {
      date: d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
      count,
    };
  });
}