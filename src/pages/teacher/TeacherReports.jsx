import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { dataService } from '../../services/dataService';
import { exportStudentMetricsCSV } from '../../utils/csvExport';
import { getTodayDateString } from '../../utils/formatters';
import { ATTENDANCE_BENCHMARK } from '../../constants/attendanceStatus';
import { StudentAttendanceModal } from '../../components/attendance/StudentAttendanceModal';
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
  const [classesLoaded, setClassesLoaded] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [studentMetrics, setStudentMetrics] = useState([]);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null);

  const loadMetrics = useCallback(async () => {
    if (!classesLoaded) return;
    try {
      let targetClassId;
      if (selectedClassId === 'ALL') {
        const assignedIds = classes.map((c) => c.id).filter(Boolean);
        if (assignedIds.length === 0) {
          setStudentMetrics([]);
          return;
        }
        targetClassId = assignedIds;
      } else {
        targetClassId = selectedClassId;
      }

      const metrics = await dataService.getStudentAttendanceMetrics(targetClassId);
      setStudentMetrics(metrics);
    } catch (err) {
      console.error('[TeacherReports] Error loading metrics:', err);
      showToast('Error loading attendance metrics', 'error');
    }
  }, [classesLoaded, classes, selectedClassId, showToast]);

  useEffect(() => {
    let isMounted = true;
    const fetchClasses = async () => {
      try {
        const teacherId = user?.id || null;
        const teacherClasses = await dataService.getClassesForTeacher(teacherId);
        if (isMounted) {
          setClasses(teacherClasses);
          setClassesLoaded(true);
        }
      } catch (err) {
        console.error('[TeacherReports] Error loading classes:', err);
        showToast('Error loading assigned classes', 'error');
        if (isMounted) {
          setClassesLoaded(true);
        }
      }
    };
    fetchClasses();
    return () => {
      isMounted = false;
    };
  }, [user, showToast]);

  useEffect(() => {
    const fetch = async () => {
      if (classesLoaded) {
        await loadMetrics();
      }
    };
    fetch();
  }, [classesLoaded, loadMetrics]);

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
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            My Attendance Reports
          </h1>
          <p className="page-subtitle">
            Class-level performance statistics, student attendance rates, and data export &bull;{' '}
            <strong style={{ color: 'var(--text-primary)' }}>Period: All Time (Full History)</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="btn-primary"
          style={{
            padding: '0.65rem 1.15rem',
            fontSize: '0.9rem',
          }}
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <StatCard
          size="compact"
          icon={TrendingUp}
          title="Overall Attendance"
          value={`${avgRate}%`}
          iconColor="var(--primary)"
          iconBg="var(--primary-light)"
        />

        <StatCard
          size="compact"
          icon={AlertTriangle}
          title="At-Risk Students"
          value={atRiskCount}
          unit={`(rate < ${ATTENDANCE_BENCHMARK.AT_RISK_THRESHOLD}%)`}
          iconColor={atRiskCount > 0 ? 'var(--status-absent-text)' : 'var(--text-secondary)'}
          iconBg={atRiskCount > 0 ? 'var(--status-absent-bg)' : 'var(--bg-subtle)'}
        />
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
                      <button
                        type="button"
                        onClick={() => {
                          const currentClass = classes.find((c) => c.id === m.student.classId);
                          setSelectedStudentForModal({
                            ...m,
                            className: currentClass?.name || 'Class Record',
                          });
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          font: 'inherit',
                          fontWeight: 600,
                          color: 'var(--primary)',
                          textDecoration: 'underline',
                          textUnderlineOffset: '3px',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        title={`Click to view absence details for ${m.student.name}`}
                        aria-label={`View absence details for ${m.student.name}`}
                      >
                        {m.student.name}
                      </button>
                    </td>
                    <td>{m.totalSessions}</td>
                    <td>
                      <span style={{ color: 'var(--status-present-text)', fontWeight: 600 }}>{m.present}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--status-absent-text)', fontWeight: 600 }}>{m.absent}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--status-late-text)', fontWeight: 600 }}>{m.late}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--status-leave-text)', fontWeight: 600 }}>{m.leave}</span>
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
                              backgroundColor: m.rate < ATTENDANCE_BENCHMARK.AT_RISK_THRESHOLD ? 'var(--status-absent)' : 'var(--status-present)',
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

      {/* Date-by-date student attendance drill-down modal */}
      <StudentAttendanceModal
        isOpen={!!selectedStudentForModal}
        onClose={() => setSelectedStudentForModal(null)}
        studentData={selectedStudentForModal}
        period="Period: All Time (Full History)"
      />
    </div>
  );
};
