/**
 * Database schema dan utility untuk Sistem Manajemen Keluhan Rumah Sakit
 * Menggunakan JSON-based persistent storage
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

// ==================== Schemas ====================

export const ComplaintSchema = z.object({
  id: z.string().uuid(),
  ticketNumber: z.string(),
  patientName: z.string().min(1),
  department: z.string().min(1),
  complaintText: z.string().min(10),
  insuranceProvider: z.string().optional(),
  status: z.enum(['new', 'reviewing', 'resolved']).default('new'),
  clusterId: z.string().optional(),
  clusterName: z.string().optional(),
  clusterVolume: z.number().default(1),
  priorityScore: z.number().default(0),
  urgencyScore: z.number().default(50),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Complaint = z.infer<typeof ComplaintSchema>;

export const ClusterSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  keyword: z.string(),
  volume: z.number(),
  relatedComplaintIds: z.array(z.string()),
  createdAt: z.date(),
});

export type Cluster = z.infer<typeof ClusterSchema>;

export const DatabaseSchema = z.object({
  complaints: z.array(ComplaintSchema),
  clusters: z.array(ClusterSchema),
  lastUpdated: z.date(),
});

export type Database = z.infer<typeof DatabaseSchema>;

// ==================== Database Manager ====================

class DatabaseManager {
  private dbPath: string;
  private dataDir: string;

  constructor() {
    this.dataDir = join(process.cwd(), '.data');
    this.dbPath = join(this.dataDir, 'db.json');
    this.ensureDbExists();
  }

  private ensureDbExists(): void {
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }

    if (!existsSync(this.dbPath)) {
      const initialDb: Database = {
        complaints: [],
        clusters: [],
        lastUpdated: new Date(),
      };
      this.write(initialDb);
    }
  }

  private read(): Database {
    try {
      const content = readFileSync(this.dbPath, 'utf-8');
      const data = JSON.parse(content);
      
      // Convert string dates back to Date objects
      return {
        complaints: data.complaints.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        })),
        clusters: data.clusters.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
        })),
        lastUpdated: new Date(data.lastUpdated),
      };
    } catch (error) {
      console.error('[DB] Error reading database:', error);
      return {
        complaints: [],
        clusters: [],
        lastUpdated: new Date(),
      };
    }
  }

  private write(data: Database): void {
    try {
      writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[DB] Error writing database:', error);
    }
  }

  addComplaint(complaint: Omit<Complaint, 'id' | 'createdAt' | 'updatedAt'>): Complaint {
    const db = this.read();
    const id = this.generateUUID();
    const now = new Date();
    
    const newComplaint: Complaint = {
      ...complaint,
      id,
      createdAt: now,
      updatedAt: now,
    };

    db.complaints.push(newComplaint);
    db.lastUpdated = now;
    this.write(db);

    return newComplaint;
  }

  getComplaints(): Complaint[] {
    const db = this.read();
    return db.complaints.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getComplaintById(id: string): Complaint | null {
    const db = this.read();
    return db.complaints.find((c) => c.id === id) || null;
  }

  updateComplaint(id: string, updates: Partial<Complaint>): Complaint | null {
    const db = this.read();
    const complaint = db.complaints.find((c) => c.id === id);
    
    if (!complaint) return null;

    const updated: Complaint = {
      ...complaint,
      ...updates,
      updatedAt: new Date(),
    };

    const index = db.complaints.findIndex((c) => c.id === id);
    db.complaints[index] = updated;
    db.lastUpdated = new Date();
    this.write(db);

    return updated;
  }

  addCluster(cluster: Omit<Cluster, 'id' | 'createdAt'>): Cluster {
    const db = this.read();
    const id = this.generateUUID();
    
    const newCluster: Cluster = {
      ...cluster,
      id,
      createdAt: new Date(),
    };

    db.clusters.push(newCluster);
    db.lastUpdated = new Date();
    this.write(db);

    return newCluster;
  }

  getClusters(): Cluster[] {
    const db = this.read();
    return db.clusters;
  }

  getClusterByName(name: string): Cluster | null {
    const db = this.read();
    return db.clusters.find((c) => c.name === name) || null;
  }

  updateCluster(id: string, updates: Partial<Cluster>): Cluster | null {
    const db = this.read();
    const cluster = db.clusters.find((c) => c.id === id);
    
    if (!cluster) return null;

    const updated: Cluster = {
      ...cluster,
      ...updates,
    };

    const index = db.clusters.findIndex((c) => c.id === id);
    db.clusters[index] = updated;
    db.lastUpdated = new Date();
    this.write(db);

    return updated;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  generateTicketNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `TKT-${random}-${timestamp}`;
  }
}

export const db = new DatabaseManager();
