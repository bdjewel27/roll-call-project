import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../context/ToastContext';
import { dataService } from '../../services/dataService';
import { formatDate, getTodayDateString } from '../../utils/formatters';
import { exportAttendanceHistoryCSV } from '../../utils/csvExport';
import { ATTENDANCE_BENCHMARK } from '../../constants/attendanceStatus';
import {
  BarChart3,
  Download,
  TrendingUp,
  UserX,
  Clock,
  FileSpreadsheet,
} from 'lucide-react';

export const ReportsPage = () => {
  const { showToast } = useToast();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [historyLogs, setHistoryLogs] = useState([]);

  const loadReports = useCallback(async () => {
    try {
      const logs = await dataService.getAttendanceHistory(
        selectedClassId === 'ALL' ? null : selectedClassId,
        startDate || null,
        endDate || null
      );
      setHistoryLogs(logs);
    } catch (err) {
      console.error('[ReportsPage] Error loading reports:', err);
      showToast('Error loading attendance reports', 'error');
    }
  }, [selectedClassId, startDate, endDate, showToast]);

  useEffect(() => {
    let isMounted = true;
    const fetchClasses = async () => {
      try {
        const cls = await dataService.getClasses();
        if (isMounted) {
          setClasses(cls);
        }
      } catch (err) {
        console.error('[ReportsPage] Error loading classes:', err);
        showToast('Error loading classes', 'error');
      }
    };
    fetchClasses();
    return () => {
      isMounted = false;
    };
  }, [showToast]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Aggregated analytics
  const metrics = useMemo(() => {
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalLeave = 0;
    let totalEntries = 0;

    historyLogs.forEach((log) => {
      totalPresent += log.stats.present;
      totalAbsent += log.stats.absent;
      totalLate += log.stats.late;
      totalLeave += log.stats.leave;
      totalEntries += log.stats.total;
    });

    const overallRate =
      totalEntries > 0
        ? Math.round(((totalPresent + totalLate) / totalEntries) * 100)
        : 0;

    return {
      totalSessions: historyLogs.length,
      totalEntries,
      totalPresent,
      totalAbsent,
      totalLate,
      totalLeave,
      overallRate,
    };
  }, [historyLogs]);

  // Export Institutional CSV with format: Date, Class, Roll No, Student Name, Status, Remarks
  const handleExportCSV = () => {
    if (historyLogs.length === 0) {
      showToast('No report logs available to export', 'error');
      return;
    }

    const filename = `School_Attendance_Report_${getTodayDateString()}.csv`;
    exportAttendanceHistoryCSV(filename, historyLogs);
    showToast('Institutional report exported to CSV successfully!', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-primary)' }}>
            Institutional Reports & Analytics
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
            Multi-class historical attendance tracking, audit logs, and institutional CSV export
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          style={{
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            padding: '0.65rem 1.15rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.9rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Download size={16} />
          <span>Export Institutional CSV</span>
        </button>
      </div>

      {/* Aggregate KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <StatCard
          size="compact"
          icon={FileSpreadsheet}
          title="Logged Sessions"
          value={metrics.totalSessions}
          unit={metrics.totalSessions === 1 ? 'session' : 'sessions'}
          iconColor="var(--primary)"
          iconBg="var(--primary-light)"
        />

        <StatCard
          size="compact"
          icon={TrendingUp}
          title="Average Attendance"
          value={`${metrics.overallRate}%`}
          iconColor={metrics.overallRate > 0 ? 'var(--status-present-text)' : 'var(--text-secondary)'}
          iconBg={metrics.overallRate > 0 ? 'var(--status-present-bg)' : 'var(--bg-subtle)'}
        />

        <StatCard
          size="compact"
          icon={UserX}
          title="Total Absences"
          value={metrics.totalAbsent}
          unit={metrics.totalAbsent === 1 ? 'record' : 'records'}
          iconColor={metrics.totalAbsent > 0 ? 'var(--status-absent-text)' : 'var(--text-secondary)'}
          iconBg={metrics.totalAbsent > 0 ? 'var(--status-absent-bg)' : 'var(--bg-subtle)'}
        />

        <StatCard
          size="compact"
          icon={Clock}
          title="Total Late Arrivals"
          value={metrics.totalLate}
          unit={metrics.totalLate === 1 ? 'record' : 'records'}
          iconColor={metrics.totalLate > 0 ? 'var(--status-late-text)' : 'var(--text-secondary)'}
          iconBg={metrics.totalLate > 0 ? 'var(--status-late-bg)' : 'var(--bg-subtle)'}
        />
      </div>

      {/* Filter Toolbar */}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label htmlFor="admin-reports-class-filter" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Filter by Class
            </label>
            <select
              id="admin-reports-class-filter"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="ALL">All Classes ({classes.length})</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="admin-reports-start-date" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              From Date
            </label>
            <input
              id="admin-reports-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label htmlFor="admin-reports-end-date" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              To Date
            </label>
            <input
              id="admin-reports-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                setSelectedClassId('ALL');
                setStartDate('');
                setEndDate('');
              }}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                padding: '0.6rem',
              }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </Card>

      {/* Breakdown Table */}
      <Card title="Session Attendance Registry" subtitle={`Showing ${historyLogs.length} logged ${historyLogs.length === 1 ? 'session' : 'sessions'}`}>
        {historyLogs.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No report records found"
            description="No attendance data matches your selected class or date parameters."
          />
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Session Date</th>
                  <th>Class Name</th>
                  <th>Total Enrolled</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Late</th>
                  <th>Leave</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {historyLogs.map((log) => (
                  <tr key={`${log.classId}_${log.date}`}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {formatDate(log.date)}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{log.className}</span>
                    </td>
                    <td>{log.stats.total}</td>
                    <td>
                      <span style={{ color: 'var(--status-present-text)', fontWeight: 700 }}>
                        {log.stats.present}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--status-absent-text)', fontWeight: 700 }}>
                        {log.stats.absent}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--status-late-text)', fontWeight: 700 }}>
                        {log.stats.late}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--status-leave-text)', fontWeight: 700 }}>
                        {log.stats.leave}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: log.stats.rate >= ATTENDANCE_BENCHMARK.AT_RISK_THRESHOLD ? 'var(--status-present-text)' : 'var(--status-absent-text)',
                        }}
                      >
                        {log.stats.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
