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
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { translations } from '@/lib/i18n';
import { Complaint } from '@/lib/db';
import { Empty } from '@/components/ui/empty';
import { Eye, Home, MessageSquare, BarChart3, User, Settings, Download, FileText } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Metrics {
  totalComplaints: number;
  avgPriority: number | string;
  pendingReview: number;
  insuranceDistribution: Record<string, number>;
  trendData: Array<{ date: string; count: number }>;
}

type MenuItem = 'dashboard' | 'complain' | 'report' | 'account' | 'setting';

const menuItems = [
  { id: 'dashboard' as MenuItem, label: 'Dashboard', icon: Home },
  { id: 'complain' as MenuItem, label: 'Complain', icon: MessageSquare },
  { id: 'report' as MenuItem, label: 'Report', icon: BarChart3 },
  { id: 'account' as MenuItem, label: 'Account', icon: User },
  { id: 'setting' as MenuItem, label: 'Setting', icon: Settings },
];

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
  const [activeMenu, setActiveMenu] = useState<MenuItem>('dashboard');
  const [trendFilter, setTrendFilter] = useState<'1week' | '1year'>('1week');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter states for Complain and Report
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [aiTargetFilter, setAiTargetFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [trendFilter]);

  async function fetchData() {
    try {
      const metricsUrl = `/api/metrics?period=${trendFilter}`;
      const [metricsRes, complaintsRes] = await Promise.all([
        fetch(metricsUrl),
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

  // --- FUNGSI BARU: DOWNLOAD DATA KE EXCEL (CSV) ---
  const handleDownloadExcel = () => {
    if (complaints.length === 0) {
      alert("Tidak ada data komplain untuk diunduh.");
      return;
    }

    // Siapkan data untuk CSV
    const dataToDownload = complaints.map(c => ({
      'Nomor Tiket': c.ticketNumber,
      'Waktu Masuk': formatDate(c.createdAt),
      'Nama Pasien': c.patientName,
      'Departemen': c.department,
      'Target AI': c.aiTarget || 'Belum diklasifikasi',
      'Priority Score': c.priorityScore.toFixed(1),
      'Cluster ID': c.clusterName || '-',
      'Status': c.status === 'new' ? 'Baru' : c.status === 'reviewing' ? 'Proses' : 'Selesai',
      'Pesan Original': c.complaintText.replace(/(\r\n|\n|\r)/gm, " ") // Hapus enter agar CSV tidak rusak
    }));

    // Buat header CSV
    const headers = Object.keys(dataToDownload[0]);
    const csvContent = [
      headers.join(','),
      ...dataToDownload.map(row => 
        headers.map(fieldName => `"${(row as any)[fieldName]}"`).join(',')
      )
    ].join('\n');

    // Trigger Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Komplain_StackPlus_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // -------------------------------------------------

  function renderContent() {
    switch (activeMenu) {
      case 'dashboard':
        return renderDashboardContent();
      case 'complain':
        return renderComplainContent();
      case 'report':
        return renderReportContent();
      case 'account':
      case 'setting':
        return renderSettingsContent();
      default:
        return renderDashboardContent();
    }
  }

  function renderDashboardContent() {
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{translations.dashboard.complaintTrendTitle}</CardTitle>
              <Select value={trendFilter} onValueChange={(value: '1week' | '1year') => setTrendFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1week">1 Minggu</SelectItem>
                  <SelectItem value="1year">1 Tahun</SelectItem>
                </SelectContent>
              </Select>
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

        {/* Complaints Table Mini (for Dashboard) */}
        <Card>
          <CardHeader>
            <CardTitle>Komplain Terbaru</CardTitle>
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
                      <TableHead>Target AI</TableHead>
                      <TableHead>{translations.dashboard.priority}</TableHead>
                      <TableHead>{translations.dashboard.status}</TableHead>
                      <TableHead className="text-right">{translations.dashboard.viewDetails}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {complaints.slice(0, 5).map((complaint) => (
                      <TableRow key={complaint.id}>
                        <TableCell className="font-mono text-sm">{complaint.ticketNumber}</TableCell>
                        <TableCell>{complaint.patientName}</TableCell>
                        <TableCell>{complaint.department}</TableCell>
                        <TableCell>
                          {complaint.aiTarget ? (
                            <Badge
                              variant="secondary"
                              className={`${
                                complaint.aiTarget === 'RS'
                                  ? 'bg-blue-100 text-blue-800'
                                  : complaint.aiTarget === 'Asuransi'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {complaint.aiTarget}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div
                            className="inline-block px-2 py-1 rounded text-xs font-semibold text-white"
                            style={{ backgroundColor: getPriorityColor(complaint.priorityScore) }}
                          >
                            {complaint.priorityScore.toFixed(1)}
                          </div>
                        </TableCell>
                        <TableCell>{complaint.status === 'new' ? translations.dashboard.statusNew : complaint.status === 'reviewing' ? translations.dashboard.statusReviewing : translations.dashboard.statusResolved}</TableCell>
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
      </div>
    );
  }

  function renderComplainContent() {
    const filteredComplaints = complaints.filter(complaint => {
      if (aiTargetFilter !== 'all' && complaint.aiTarget !== aiTargetFilter) return false;
      if (statusFilter !== 'all' && complaint.status !== statusFilter) return false;
      if (priorityFilter !== 'all') {
        const priority = priorityFilter === 'high' ? complaint.priorityScore >= 75 :
                        priorityFilter === 'medium' ? complaint.priorityScore >= 50 && complaint.priorityScore < 75 :
                        complaint.priorityScore < 50;
        if (!priority) return false;
      }
      if (dateRange.from && new Date(complaint.createdAt) < dateRange.from) return false;
      if (dateRange.to && new Date(complaint.createdAt) > dateRange.to) return false;
      return true;
    });

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Keluhan Pasien</h1>
          <p className="text-gray-600">Kelola dan pantau semua keluhan pasien secara mendetail</p>
        </div>

        {/* Filter Form */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Keluhan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Rentang Tanggal</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pilih tanggal</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Target AI</label>
                <Select value={aiTargetFilter} onValueChange={setAiTargetFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="RS">RS</SelectItem>
                    <SelectItem value="Asuransi">Asuransi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="new">Baru</SelectItem>
                    <SelectItem value="reviewing">Proses</SelectItem>
                    <SelectItem value="resolved">Tertangani</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Prioritas</label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="high">Tinggi</SelectItem>
                    <SelectItem value="medium">Sedang</SelectItem>
                    <SelectItem value="low">Rendah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Complaints Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Keluhan ({filteredComplaints.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredComplaints.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{translations.dashboard.ticketNumber}</TableHead>
                      <TableHead>{translations.dashboard.patientName}</TableHead>
                      <TableHead>{translations.dashboard.department}</TableHead>
                      <TableHead>Target AI</TableHead>
                      <TableHead>{translations.dashboard.priority}</TableHead>
                      <TableHead>{translations.dashboard.status}</TableHead>
                      <TableHead>{translations.dashboard.date}</TableHead>
                      <TableHead className="text-right">{translations.dashboard.viewDetails}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredComplaints.map((complaint) => (
                      <TableRow key={complaint.id}>
                        <TableCell className="font-mono text-sm">{complaint.ticketNumber}</TableCell>
                        <TableCell>{complaint.patientName}</TableCell>
                        <TableCell>{complaint.department}</TableCell>
                        <TableCell>
                          {complaint.aiTarget ? (
                            <Badge
                              variant="secondary"
                              className={`${
                                complaint.aiTarget === 'RS'
                                  ? 'bg-blue-100 text-blue-800'
                                  : complaint.aiTarget === 'Asuransi'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {complaint.aiTarget}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>
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
              <Empty description="Tidak ada keluhan yang sesuai dengan filter" />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderReportContent() {
    // Mock data for priority-based trend
    const priorityTrendData = [
      { priority: 'Rendah', count: 45 },
      { priority: 'Sedang', count: 32 },
      { priority: 'Tinggi', count: 18 },
      { priority: 'Kritis', count: 5 },
    ];

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Laporan Keluhan</h1>
          <p className="text-gray-600">Hasilkan laporan komprehensif untuk analisis mendalam</p>
        </div>

        {/* Filter Form */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Parameter Laporan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Rentang Tanggal</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pilih tanggal</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Target AI</label>
                <Select value={aiTargetFilter} onValueChange={setAiTargetFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="RS">RS</SelectItem>
                    <SelectItem value="Asuransi">Asuransi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="new">Baru</SelectItem>
                    <SelectItem value="reviewing">Proses</SelectItem>
                    <SelectItem value="resolved">Tertangani</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Tingkat Prioritas</label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="high">Tinggi</SelectItem>
                    <SelectItem value="medium">Sedang</SelectItem>
                    <SelectItem value="low">Rendah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-6 flex gap-4 border-t pt-6">
              <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                <FileText className="w-4 h-4" />
                Generate Report
              </Button>
              {/* TOMBOL EXCEL DITAMBAHKAN ONCLICK DI SINI */}
              <Button onClick={handleDownloadExcel} variant="outline" className="flex items-center gap-2 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800">
                <Download className="w-4 h-4" />
                Download Excel (.csv)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Pratinjau Distribusi Prioritas Laporan</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="priority" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8b5cf6" name="Jumlah Keluhan (Simulasi)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderSettingsContent() {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold capitalize">{activeMenu} Settings</h1>
          <p className="text-gray-600">Konfigurasi panel Super Admin</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dalam Pengembangan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-40 space-y-4">
              <Settings className="w-12 h-12 text-slate-300 animate-spin-slow" />
              <p className="text-slate-500 font-medium">Halaman ini akan tersedia pada pembaruan sistem berikutnya.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 font-medium">Memuat data omnichannel...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
        {/* Sidebar Navigation - DIPERBAIKI TEXT WARNANYA */}
        <Sidebar className="border-r bg-white text-slate-800 h-full shrink-0 shadow-sm">
          <SidebarHeader className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">SP</span>
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">StackPlus</h2>
                <p className="text-xs font-semibold text-blue-600">Omnichannel AI</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-3 py-6 h-full overflow-y-auto">
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => setActiveMenu(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer",
                        isActive 
                          ? "bg-blue-600 text-white shadow-md hover:bg-blue-700" 
                          : "text-slate-500 hover:bg-slate-100 hover:text-blue-600 font-medium"
                      )}
                    >
                      <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400")} />
                      <span className="text-sm">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-slate-100">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>System Status</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Online</span>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
          <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden" />
              <div className="hidden md:block">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Environment: Production Demo
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border hover:bg-slate-200 cursor-pointer transition-colors">
                 <User className="w-4 h-4 text-slate-600" />
               </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
            <div className="max-w-7xl mx-auto w-full">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>

      {/* Complaint Details Dialog (Popup) */}
      <Dialog open={!!selectedComplaint} onOpenChange={(open) => !open && setSelectedComplaint(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Detail Komplain Omnichannel
            </DialogTitle>
            <DialogDescription>
              Informasi lengkap keluhan pasien dari kanal integrasi.
            </DialogDescription>
          </DialogHeader>
          
          {selectedComplaint && (
            <div className="space-y-6 mt-4">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nomor Tiket</p>
                  <p className="font-mono font-medium text-slate-900 bg-white px-2 py-1 border rounded inline-block">{selectedComplaint.ticketNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Pasien</p>
                  <p className="font-medium text-slate-900">{selectedComplaint.patientName}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Departemen / Kategori</p>
                  <p className="font-medium text-slate-900">{selectedComplaint.department}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status Penanganan</p>
                  <Badge variant="outline" className={cn(
                    "capitalize",
                    selectedComplaint.status === 'new' ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                    selectedComplaint.status === 'reviewing' ? "bg-blue-50 text-blue-700 border-blue-200" :
                    "bg-green-50 text-green-700 border-green-200"
                  )}>
                    {selectedComplaint.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Target AI</p>
                  <div className="mt-1">
                    {selectedComplaint.aiTarget ? (
                      <Badge className={
                        selectedComplaint.aiTarget === 'RS' ? 'bg-blue-600 hover:bg-blue-700' :
                        selectedComplaint.aiTarget === 'Asuransi' ? 'bg-purple-600 hover:bg-purple-700' :
                        'bg-emerald-600 hover:bg-emerald-700'
                      }>
                        {selectedComplaint.aiTarget}
                      </Badge>
                    ) : (
                      <span className="text-slate-400 text-sm">-</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Waktu Masuk</p>
                  <p className="font-medium text-slate-900">{formatDate(selectedComplaint.createdAt)}</p>
                </div>
              </div>

              {/* Message Box */}
              <div>
                <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500"/>
                  Pesan Komplain Original
                </p>
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedComplaint.complaintText}
                </div>
              </div>

              {/* AI Analysis Result */}
              {selectedComplaint.clusterName && (
                <div className="p-5 border border-blue-100 bg-gradient-to-r from-blue-50 to-white rounded-xl space-y-4">
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                     <p className="font-bold text-blue-900">Analisis Kecerdasan Buatan (AI)</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cluster Similarity Group</p>
                      <p className="text-sm font-semibold text-slate-800 bg-slate-100 px-2 py-1 rounded inline-block">{selectedComplaint.clusterName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Priority Urgency Score</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-black tracking-tighter" style={{ color: getPriorityColor(selectedComplaint.priorityScore) }}>
                          {selectedComplaint.priorityScore.toFixed(1)}
                        </p>
                        <span className="text-sm font-semibold text-slate-400">/ 100</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}