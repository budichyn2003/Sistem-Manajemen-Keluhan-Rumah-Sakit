/**
 * Admin Dashboard Component
 * Dasbor untuk monitoring dan management keluhan
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { translations } from '@/lib/i18n';
import { Complaint } from '@/lib/db';
import { Empty } from '@/components/ui/empty';
import { Eye } from 'lucide-react';

interface Metrics {
  totalComplaints: number;
  avgPriority: number | string;
  pendingReview: number;
  insuranceDistribution: Record<string, number>;
  trendData: Array<{ date: string; count: number }>;
}

const PRIORITY_COLORS = {
  0: '#10b981', // Low - Green
  1: '#f59e0b', // Medium - Amber
  2: '#ef4444', // High - Red
  3: '#7c3aed', // Critical - Violet
};

const INSURANCE_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
];

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      const [metricsRes, complaintsRes] = await Promise.all([
        fetch('/api/metrics'),
        fetch('/api/complaints'),
      ]);

      const metricsData = await metricsRes.json();
      const complaintsData = await complaintsRes.json();

      if (metricsData.success) {
        setMetrics(metricsData.data);
      }

      if (complaintsData.success) {
        setComplaints(complaintsData.data);
      }
    } catch (error) {
      console.error('[Dashboard] Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getPriorityLevel(score: number): string {
    if (score < 25) return translations.dashboard.priorityLow;
    if (score < 50) return translations.dashboard.priorityMedium;
    if (score < 75) return translations.dashboard.priorityHigh;
    return translations.dashboard.priorityCritical;
  }

  function getPriorityColor(score: number): string {
    if (score < 25) return '#10b981';
    if (score < 50) return '#f59e0b';
    if (score < 75) return '#ef4444';
    return '#7c3aed';
  }

  function formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96">{translations.dashboard.noData}</div>;
  }

  const insuranceChartData = metrics
    ? Object.entries(metrics.insuranceDistribution).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{translations.dashboard.welcomeTitle}</h1>
        <p className="text-gray-600">{translations.dashboard.welcomeSubtitle}</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{translations.dashboard.totalComplaints}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalComplaints || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{translations.dashboard.avgPriority}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.avgPriority || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{translations.dashboard.pendingReview}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics?.pendingReview || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{translations.dashboard.rsVsInsurance}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {insuranceChartData.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{translations.dashboard.complaintTrendTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics?.trendData && metrics.trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    name={translations.dashboard.countLabel}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <Empty description={translations.dashboard.noData} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insurance Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>{translations.dashboard.rsVsInsuranceTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            {insuranceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={insuranceChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {insuranceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={INSURANCE_COLORS[index % INSURANCE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <Empty description={translations.dashboard.noData} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Complaints Table */}
      <Card>
        <CardHeader>
          <CardTitle>{translations.dashboard.complaintsTable}</CardTitle>
        </CardHeader>
        <CardContent>
          {complaints.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{translations.dashboard.ticketNumber}</TableHead>
                    <TableHead>{translations.dashboard.patientName}</TableHead>
                    <TableHead>{translations.dashboard.department}</TableHead>
                    <TableHead>{translations.dashboard.priority}</TableHead>
                    <TableHead>{translations.dashboard.status}</TableHead>
                    <TableHead>{translations.dashboard.date}</TableHead>
                    <TableHead className="text-right">{translations.dashboard.viewDetails}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complaints.slice(0, 10).map((complaint) => (
                    <TableRow key={complaint.id}>
                      <TableCell className="font-mono text-sm">{complaint.ticketNumber}</TableCell>
                      <TableCell>{complaint.patientName}</TableCell>
                      <TableCell>{complaint.department}</TableCell>
                      <TableCell>
                        <div
                          className="inline-block px-2 py-1 rounded text-xs font-semibold text-white"
                          style={{ backgroundColor: getPriorityColor(complaint.priorityScore) }}
                        >
                          {complaint.priorityScore.toFixed(1)}
                        </div>
                      </TableCell>
                      <TableCell>{complaint.status === 'new' ? translations.dashboard.statusNew : complaint.status === 'reviewing' ? translations.dashboard.statusReviewing : translations.dashboard.statusResolved}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(complaint.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedComplaint(complaint)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Empty description={translations.dashboard.noData} />
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedComplaint} onOpenChange={() => setSelectedComplaint(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{translations.dashboard.detailsTitle}</DialogTitle>
            <DialogDescription className="sr-only">
              Detail informasi keluhan pasien
            </DialogDescription>
          </DialogHeader>
          
          {selectedComplaint && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600">{translations.dashboard.ticketNumber}</p>
                  <p className="font-mono">{selectedComplaint.ticketNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">{translations.dashboard.patientName}</p>
                  <p>{selectedComplaint.patientName}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">{translations.dashboard.department}</p>
                  <p>{selectedComplaint.department}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">{translations.dashboard.status}</p>
                  <p>{selectedComplaint.status === 'new' ? translations.dashboard.statusNew : selectedComplaint.status === 'reviewing' ? translations.dashboard.statusReviewing : translations.dashboard.statusResolved}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-600">{translations.dashboard.complaintDetails}</p>
                <p className="mt-2 text-gray-700">{selectedComplaint.complaintText}</p>
              </div>

              {selectedComplaint.clusterName && (
                <div className="bg-gray-50 p-4 rounded space-y-2">
                  <p className="font-semibold">{translations.dashboard.clusterInfo}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">{translations.dashboard.clusterName}</p>
                      <p>{selectedComplaint.clusterName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{translations.dashboard.clusterVolume}</p>
                      <p>{selectedComplaint.clusterVolume}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{translations.dashboard.priorityScore}</p>
                      <p className="text-lg font-bold" style={{ color: getPriorityColor(selectedComplaint.priorityScore) }}>
                        {selectedComplaint.priorityScore.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600">{translations.dashboard.createdAt}</p>
                <p>{formatDate(selectedComplaint.createdAt)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}