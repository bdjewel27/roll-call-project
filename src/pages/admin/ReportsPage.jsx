import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../context/ToastContext';
import { dataService } from '../../services/dataService';
import { formatDate } from '../../utils/formatters';
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
  const [loading, setLoading] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, startDate, endDate, showToast]);

  useEffect(() => {
    let isMounted = true;
    const fetchClasses = async () => {
      const cls = await dataService.getClasses();
      if (isMounted) {
        setClasses(cls);
      }
    };
    fetchClasses();
    return () => {
      isMounted = false;
    };
  }, []);

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

    const headers = ['Date', 'Class', 'Roll No', 'Student Name', 'Status', 'Remarks'];
    const rows = [];

    historyLogs.forEach((log) => {
      const sessionDate = log.date;
      const className = log.className;

      if (log.students && log.students.length > 0) {
        log.students.forEach((s) => {
          rows.push([
            `"${sessionDate}"`,
            `"${className.replace(/"/g, '""')}"`,
            `"${(s.rollNo || '').replace(/"/g, '""')}"`,
            `"${(s.studentName || '').replace(/"/g, '""')}"`,
            `"${(s.status || '').toUpperCase()}"`,
            `"${(s.remark || '').replace(/"/g, '""')}"`,
          ]);
        });
      } else {
        rows.push([
          `"${sessionDate}"`,
          `"${className.replace(/"/g, '""')}"`,
          '""',
          '""',
          '""',
          '""',
        ]);
      }
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `School_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

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
        <Card style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Logged Sessions</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {metrics.totalSessions} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>sessions</span>
            </div>
          </div>
        </Card>

        <Card style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: 'var(--status-present-bg)',
              color: 'var(--status-present)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Average Attendance</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {metrics.overallRate}%
            </div>
          </div>
        </Card>

        <Card style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: 'var(--status-absent-bg)',
              color: 'var(--status-absent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UserX size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Absences</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {metrics.totalAbsent} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>records</span>
            </div>
          </div>
        </Card>

        <Card style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: 'var(--status-late-bg)',
              color: 'var(--status-late)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Late Arrivals</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {metrics.totalLate} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>records</span>
            </div>
          </div>
        </Card>
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
      <Card title="Session Attendance Registry" subtitle={`Showing ${historyLogs.length} logged sessions`}>
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
                      <span style={{ color: 'var(--status-present)', fontWeight: 700 }}>
                        {log.stats.present}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--status-absent)', fontWeight: 700 }}>
                        {log.stats.absent}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--status-late)', fontWeight: 700 }}>
                        {log.stats.late}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--status-leave)', fontWeight: 700 }}>
                        {log.stats.leave}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: log.stats.rate >= 80 ? 'var(--status-present)' : 'var(--status-absent)',
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
