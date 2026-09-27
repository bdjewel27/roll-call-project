import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { dataService } from '../../services/dataService';
import { exportStudentMetricsCSV } from '../../utils/csvExport';
import { getTodayDateString } from '../../utils/formatters';
import {
  FileBarChart,
  Download,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';

export const TeacherReports = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [studentMetrics, setStudentMetrics] = useState([]);

  const loadMetrics = useCallback(async () => {
    try {
      const metrics = await dataService.getStudentAttendanceMetrics(
        selectedClassId === 'ALL' ? null : selectedClassId
      );
      setStudentMetrics(metrics);
    } catch (err) {
      console.error('[TeacherReports] Error loading metrics:', err);
      showToast('Error loading attendance metrics', 'error');
    }
  }, [selectedClassId, showToast]);

  useEffect(() => {
    let isMounted = true;
    const fetchClasses = async () => {
      try {
        const teacherId = user?.id || null;
        let teacherClasses = await dataService.getClassesForTeacher(teacherId);
        if (isMounted) {
          setClasses(teacherClasses);
        }
      } catch (err) {
        console.error('[TeacherReports] Error loading classes:', err);
        showToast('Error loading assigned classes', 'error');
      }
    };
    fetchClasses();
    return () => {
      isMounted = false;
    };
  }, [user, showToast]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Export CSV generator
  const handleExportCSV = () => {
    if (studentMetrics.length === 0) {
      showToast('No metrics available to export', 'error');
      return;
    }

    const filename = `Attendance_Report_${selectedClassId}_${getTodayDateString()}.csv`;
    exportStudentMetricsCSV(filename, studentMetrics);
    showToast('Attendance report exported to CSV successfully!', 'success');
  };

  const atRiskCount = studentMetrics.filter((m) => m.isAtRisk).length;
  const avgRate =
    studentMetrics.length > 0
      ? Math.round(
          studentMetrics.reduce((acc, m) => acc + m.rate, 0) / studentMetrics.length
        )
      : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-primary)' }}>
            My Attendance Reports
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
            Class-level performance statistics, student attendance rates, and data export
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
          <span>Export CSV</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
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
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Overall Attendance</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {avgRate}%
            </div>
          </div>
        </Card>

        <Card style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: atRiskCount > 0 ? 'var(--status-absent-bg)' : 'var(--status-present-bg)',
              color: atRiskCount > 0 ? 'var(--status-absent)' : 'var(--status-present)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>At-Risk Students</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {atRiskCount} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>(rate &lt; 75%)</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <label htmlFor="teacher-reports-class-filter" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Select Class for Report
            </label>
            <select
              id="teacher-reports-class-filter"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="ALL">All My Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Student Rate Breakdown Table */}
      <Card title="Student Attendance Breakdown" subtitle="Aggregate attendance statistics across all tracked sessions">
        {studentMetrics.length === 0 ? (
          <EmptyState
            icon={FileBarChart}
            title="No student data available"
            description="No students or attendance records found for this class."
          />
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Roll #</th>
                  <th>Student Name</th>
                  <th>Sessions</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Late</th>
                  <th>Leave</th>
                  <th>Attendance %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {studentMetrics.map((m) => (
                  <tr key={m.student.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {m.student.rollNo}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {m.student.name}
                    </td>
                    <td>{m.totalSessions}</td>
                    <td>
                      <span style={{ color: 'var(--status-present)', fontWeight: 600 }}>{m.present}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--status-absent)', fontWeight: 600 }}>{m.absent}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--status-late)', fontWeight: 600 }}>{m.late}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--status-leave)', fontWeight: 600 }}>{m.leave}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            flex: 1,
                            maxWidth: '80px',
                            height: '6px',
                            backgroundColor: 'var(--bg-subtle)',
                            borderRadius: '9999px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${m.rate}%`,
                              height: '100%',
                              backgroundColor: m.rate < 75 ? 'var(--status-absent)' : 'var(--status-present)',
                              borderRadius: '9999px',
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{m.rate}%</span>
                      </div>
                    </td>
                    <td>
                      {m.isAtRisk ? (
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            backgroundColor: 'var(--status-absent-bg)',
                            color: 'var(--status-absent-text)',
                            border: '1px solid var(--status-absent-border)',
                          }}
                        >
                          ⚠ At Risk
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            backgroundColor: 'var(--status-present-bg)',
                            color: 'var(--status-present-text)',
                            border: '1px solid var(--status-present-border)',
                          }}
                        >
                          ✓ Good
                        </span>
                      )}
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
