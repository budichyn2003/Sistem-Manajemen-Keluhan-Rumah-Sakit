/**
 * API Route: POST /api/complaints
 * Mengirim keluhan baru ke sistem
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, Complaint } from '@/lib/db';
import { translations } from '@/lib/i18n';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const SubmitComplaintSchema = z.object({
  patientName: z.string().min(1, translations.form.patientNameRequired),
  department: z.string().min(1, translations.form.departmentRequired),
  complaintText: z.string().min(10, translations.form.complaintTextMinLength),
  insuranceProvider: z.string().optional(),
});

type SubmitComplaintInput = z.infer<typeof SubmitComplaintSchema>;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validasi input
    const validatedData = SubmitComplaintSchema.parse(body);

    // Generate ticket number
    const ticketNumber = db.generateTicketNumber();

    // Buat complaint baru dengan urgency score dasar
    const complaint = db.addComplaint({
      ticketNumber,
      patientName: validatedData.patientName,
      department: validatedData.department,
      complaintText: validatedData.complaintText,
      insuranceProvider: validatedData.insuranceProvider || 'umum',
      status: 'new',
      urgencyScore: 50, // Default urgency score
      priorityScore: 50, // Akan diupdate setelah AI clustering
    });

    // Trigger AI clustering (simulasi dengan async task)
    triggerAIClustering(complaint);

    // Revalidate halaman admin agar data langsung muncul
    revalidatePath('/admin');

    return NextResponse.json(
      {
        success: true,
        message: translations.form.successMessage,
        ticket: {
          id: complaint.id,
          ticketNumber: complaint.ticketNumber,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Error submitting complaint:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: translations.errors.invalidInput,
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: translations.errors.serverError,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const complaints = db.getComplaints();
    return NextResponse.json({ success: true, data: complaints }, { status: 200 });
  } catch (error) {
    console.error('[API] Error fetching complaints:', error);
    return NextResponse.json(
      { success: false, error: translations.errors.serverError },
      { status: 500 }
    );
  }
}

/**
 * Trigger AI clustering untuk complaint
 * Dalam implementasi production, ini akan call external AI microservice
 */
async function triggerAIClustering(complaint: Complaint) {
  try {
    // Simulasi AI clustering delay
    setTimeout(async () => {
      await performAIClustering(complaint);
    }, 1000);
  } catch (error) {
    console.error('[API] Error triggering AI clustering:', error);
  }
}

/**
 * Melakukan AI clustering dan update priority score
 */
async function performAIClustering(complaint: Complaint) {
  try {
    // Call Python AI microservice
    const aiResponse = await fetch('http://127.0.0.1:8000/api/v1/analyze-complaint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        complaint_id: complaint.id,
        text: complaint.complaintText,
      }),
    });

    if (!aiResponse.ok) {
      console.error(`[AI] Python service error: ${aiResponse.status}`);
      // Fallback to old logic if Python service is down
      await performFallbackClustering(complaint);
      return;
    }

    const aiData = await aiResponse.json();
    const { extracted_data, clustering } = aiData;

    // Extract AI results
    const aiTarget = extracted_data.target; // "RS", "Asuransi", or "Keduanya"
    const baseUrgencyScore = extracted_data.base_urgency_score;
    const clusterId = clustering.cluster_id;
    const isNewCluster = clustering.is_new_cluster;

    // Update urgency score from AI
    const urgencyScore = baseUrgencyScore;

    // Handle clustering
    let clusterName: string | undefined;
    let clusterVolume = 1;
    let priorityScore = urgencyScore;

    if (isNewCluster) {
      // Create new cluster
      const newCluster = db.addCluster({
        name: `Cluster ${clusterId.slice(0, 8)}`,
        keyword: extracted_data.category.toLowerCase(),
        volume: 1,
        relatedComplaintIds: [complaint.id],
      });
      clusterName = newCluster.name;
      clusterVolume = 1;
    } else {
      // Find existing cluster
      const existingCluster = db.getClusters().find(c => c.id === clusterId);
      if (existingCluster) {
        clusterName = existingCluster.name;
        clusterVolume = existingCluster.relatedComplaintIds.length + 1;
        priorityScore = urgencyScore + (clusterVolume * 0.5);

        // Update existing cluster
        db.updateCluster(existingCluster.id, {
          volume: clusterVolume,
          relatedComplaintIds: [...existingCluster.relatedComplaintIds, complaint.id],
        });
      }
    }

    // Update complaint dengan AI results
    db.updateComplaint(complaint.id, {
      priorityScore: Math.round(priorityScore * 10) / 10,
      clusterId,
      clusterName,
      clusterVolume,
      urgencyScore,
      aiTarget,
      status: 'reviewing',
    });

    console.log(`[AI] Complaint ${complaint.ticketNumber} analyzed successfully. Target: ${aiTarget}`);
  } catch (error) {
    console.error('[AI] Error during AI clustering:', error);
    // Fallback to old logic
    await performFallbackClustering(complaint);
  }
}

/**
 * Fallback clustering when Python AI service is unavailable
 */
async function performFallbackClustering(complaint: Complaint) {
  try {
    // Extract keywords dari complaint text
    const keywords = extractKeywords(complaint.complaintText);

    // Cari cluster yang match
    const clusters = db.getClusters();
    let matchedCluster = null;

    for (const cluster of clusters) {
      if (keywords.some(kw => cluster.keyword.toLowerCase().includes(kw.toLowerCase()))) {
        matchedCluster = cluster;
        break;
      }
    }

    // Calculate priority score: base_urgency_score + (cluster_volume * 0.5)
    const baseUrgency = complaint.urgencyScore;
    let priorityScore = baseUrgency;
    let clusterId = undefined;
    let clusterName = undefined;
    let clusterVolume = 1;

    if (matchedCluster) {
      clusterVolume = matchedCluster.relatedComplaintIds.length + 1;
      priorityScore = baseUrgency + (clusterVolume * 0.5);
      clusterId = matchedCluster.id;
      clusterName = matchedCluster.name;

      // Update cluster
      db.updateCluster(matchedCluster.id, {
        volume: clusterVolume,
        relatedComplaintIds: [...matchedCluster.relatedComplaintIds, complaint.id],
      });
    } else {
      // Create new cluster if keywords match pattern
      if (keywords.length > 0) {
        const newCluster = db.addCluster({
          name: `Keluhan ${keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1)}`,
          keyword: keywords[0],
          volume: 1,
          relatedComplaintIds: [complaint.id],
        });
        clusterId = newCluster.id;
        clusterName = newCluster.name;
        clusterVolume = 1;
      }
    }

    // Update complaint dengan priority score dan cluster info
    db.updateComplaint(complaint.id, {
      priorityScore: Math.round(priorityScore * 10) / 10,
      clusterId,
      clusterName,
      clusterVolume,
      status: 'reviewing',
    });

    console.log(`[AI] Fallback clustering for ${complaint.ticketNumber} completed`);
  } catch (error) {
    console.error('[AI] Error during fallback clustering:', error);
  }
}