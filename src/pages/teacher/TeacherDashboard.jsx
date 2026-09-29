import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../hooks/useAuth';
import { dataService } from '../../services/dataService';
import { ATTENDANCE_STATUS } from '../../constants/attendanceStatus';
import { formatDate, getTodayDateString } from '../../utils/formatters';
import { Link } from 'react-router-dom';
import { StudentAvatar } from '../../components/common/StudentAvatar';
import { StudentAttendanceModal } from '../../components/attendance/StudentAttendanceModal';
import {
  School,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export const TeacherDashboard = () => {
  const { user } = useAuth();
  const [todayDate] = useState(getTodayDateString());
  const [assignedClassesStatus, setAssignedClassesStatus] = useState([]);
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryStats, setSummaryStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    markedClasses: 0,
    overallRate: 0,
  });

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const teacherId = user?.id || null;

      // Fetch classes directly from Supabase via dataService
      const teacherClasses = await dataService.getClassesForTeacher(teacherId);
      const assignedClassIds = (teacherClasses || []).map((c) => c.id).filter(Boolean);
      const [todayLogs, studentMetrics] = await Promise.all([
        assignedClassIds.length > 0
          ? dataService.getAttendanceHistory(assignedClassIds, todayDate, todayDate)
          : Promise.resolve([]),
        assignedClassIds.length > 0
          ? dataService.getStudentAttendanceMetrics(assignedClassIds)
          : Promise.resolve([]),
      ]);

      const flaggedStudents = (studentMetrics || []).filter(
        (m) => (m.isAtRisk || m.isConsecutiveAbsent) && m.totalSessions > 0
      );
      setAtRiskStudents(flaggedStudents);

      const historyMap = {};
      (todayLogs || []).forEach((log) => {
        if (log.classId) {
          historyMap[log.classId] = log;
        }
      });

      let totalStudents = 0;
      let markedCount = 0;
      let presentOrLateSum = 0;
      let totalAttendanceEntries = 0;

      const classStatusList = teacherClasses.map((cls) => {
        totalStudents += cls.studentCount || 0;
        const todayRecord = historyMap[cls.id] || null;
        const isMarked = !!todayRecord && Array.isArray(todayRecord.students) && todayRecord.students.length > 0;
        if (isMarked) {
          markedCount++;
          todayRecord.students.forEach((s) => {
            totalAttendanceEntries++;
            if (s.status === ATTENDANCE_STATUS.PRESENT || s.status === ATTENDANCE_STATUS.LATE) {
              presentOrLateSum++;
            }
          });
        }

        return {
          ...cls,
          isMarked,
          record: todayRecord,
        };
      });

      setAssignedClassesStatus(classStatusList);

      const overallRate =
        totalAttendanceEntries > 0
          ? Math.round((presentOrLateSum / totalAttendanceEntries) * 100)
          : 0;

      setSummaryStats({
        totalClasses: teacherClasses.length,
        totalStudents,
        markedClasses: markedCount,
        overallRate,
      });
    } catch (err) {
      console.error('[TeacherDashboard] Error loading dashboard data:', err);
      setError('Unable to load your class and attendance data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [user, todayDate]);

  useEffect(() => {
    const fetch = async () => {
      await loadDashboardData();
    };
    fetch();
  }, [loadDashboardData]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Welcome back, {user?.fullName || 'Teacher'}
          </h1>
          <p className="page-subtitle">
            Faculty Workspace &middot; Today is {formatDate(todayDate)}
          </p>
        </div>

        <Link
          to="/teacher/attendance"
          className="btn-primary"
          style={{
            padding: '0.65rem 1.15rem',
            fontSize: '0.9rem',
          }}
        >
          <span>Take Attendance</span>
          <ArrowRight size={16} />
        </Link>
      </div>

      {error ? (
        <Card>
          <div className="error-state-card">
            <div className="error-state-icon">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="error-state-title">
                Unable to Load Dashboard Data
              </h3>
              <p className="error-state-desc">
                {error}
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadDashboardData()}
              className="btn-primary"
            >
              <RotateCcw size={15} />
              <span>Retry</span>
            </button>
          </div>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <StatCard
              icon={School}
              title="My Assigned Classes"
              value={loading ? '—' : summaryStats.totalClasses}
              unit={!loading ? (summaryStats.totalClasses === 1 ? 'class' : 'classes') : undefined}
              iconColor="var(--primary)"
              iconBg="var(--primary-light)"
            />

            <StatCard
              icon={Users}
              title="Total Students"
              value={loading ? '—' : summaryStats.totalStudents}
              unit={!loading ? (summaryStats.totalStudents === 1 ? 'student' : 'students') : undefined}
              iconColor="var(--status-present-text)"
              iconBg="var(--status-present-bg)"
            />

            <StatCard
              icon={CheckCircle2}
              title="Today's Roll Call"
              value={loading ? '—' : `${summaryStats.markedClasses} / ${summaryStats.totalClasses}`}
              unit={!loading ? 'completed' : undefined}
              iconColor={
                !loading && summaryStats.markedClasses === summaryStats.totalClasses && summaryStats.totalClasses > 0
                  ? 'var(--status-present-text)'
                  : 'var(--status-late-text)'
              }
              iconBg={
                !loading && summaryStats.markedClasses === summaryStats.totalClasses && summaryStats.totalClasses > 0
                  ? 'var(--status-present-bg)'
                  : 'var(--status-late-bg)'
              }
            />

            <StatCard
              icon={TrendingUp}
              title="Average Attendance"
              value={loading ? '—' : `${summaryStats.overallRate}%`}
              iconColor="var(--primary)"
              iconBg="var(--primary-light)"
            />
          </div>

          {/* Proactive At-Risk & Consecutive Absence Alerts */}
          <Card
            title="Students at Risk"
            subtitle="Students with attendance below 75% or absent for 3+ consecutive days"
            extra={
              atRiskStudents.length > 0 ? (
                <span
                  style={{
                    padding: '0.2rem 0.65rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: 'var(--status-absent-bg)',
                    color: 'var(--status-absent-text)',
                    border: '1px solid var(--status-absent-border)',
                  }}
                >
                  {atRiskStudents.length} {atRiskStudents.length === 1 ? 'Student' : 'Students'}
                </span>
              ) : null
            }
          >
            {loading ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>
                Analyzing student attendance patterns...
              </p>
            ) : atRiskStudents.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem 1.25rem',
                  borderRadius: '10px',
                  backgroundColor: 'var(--status-present-bg)',
                  border: '1px solid var(--status-present-border)',
                  color: 'var(--status-present-text)',
                }}
              >
                <CheckCircle2 size={22} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.925rem' }}>
                    All clear — no students are currently at risk
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                    No students currently have attendance below 75% or have been absent for 3 or more consecutive days.
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {atRiskStudents.map((m) => {
                  const assignedClass = assignedClassesStatus.find((c) => c.id === m.student.classId);
                  return (
                    <div
                      key={m.student.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1.15rem',
                        borderRadius: '10px',
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-color)',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <StudentAvatar student={m.student} size={40} shape="circle" />
                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedStudentForModal({
                                ...m,
                                className: assignedClass?.name || 'Assigned Class',
                              })
                            }
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              font: 'inherit',
                              fontWeight: 700,
                              fontSize: '0.95rem',
                              color: 'var(--text-primary)',
                              textDecoration: 'underline',
                              textUnderlineOffset: '2px',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                            title={`Click to view details for ${m.student.name}`}
                          >
                            {m.student.name}
                          </button>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            Roll #{m.student.rollNo} &bull; {assignedClass?.name || 'Class'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        {m.isConsecutiveAbsent && (
                          <span
                            style={{
                              padding: '0.25rem 0.65rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: 'var(--status-absent-bg)',
                              color: 'var(--status-absent-text)',
                              border: '1px solid var(--status-absent-border)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <AlertTriangle size={13} />
                            <span>Absent for {m.consecutiveAbsentDays} consecutive days</span>
                          </span>
                        )}

                        {m.isAtRisk && (
                          <span
                            style={{
                              padding: '0.25rem 0.65rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: 'var(--status-late-bg)',
                              color: 'var(--status-late-text)',
                              border: '1px solid var(--status-late-border)',
                            }}
                          >
                            {m.rate}% At Risk
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedStudentForModal({
                              ...m,
                              className: assignedClass?.name || 'Assigned Class',
                            })
                          }
                          className="btn-secondary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                        >
                          View History
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

      {/* Today's Roll Call Tracker */}
      <Card
        title="Today's Roll Call Status"
        subtitle="Mark attendance or review recorded sessions for your assigned classes"
        extra={
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Date: <strong>{todayDate}</strong>
          </span>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
          {loading ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1.5rem' }}>
              Loading classes from Supabase...
            </p>
          ) : assignedClassesStatus.length === 0 ? (
            <EmptyState
              icon={School}
              title="No classes assigned"
              description="You have not been assigned to any classes yet. Please contact an administrator to assign classes to your account."
            />
          ) : (
            assignedClassesStatus.map((cls) => (
              <div
                key={cls.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1.1rem 1.25rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-subtle)',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    {cls.name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {cls.room || 'Classroom'} &bull; {cls.studentCount || 0} {(cls.studentCount || 0) === 1 ? 'Student' : 'Students'} enrolled
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span className={`status-pill ${cls.isMarked ? 'status-pill-marked' : 'status-pill-pending'}`}>
                    {cls.isMarked ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                    <span>{cls.isMarked ? 'Marked Today' : 'Pending Roll Call'}</span>
                  </span>

                  <Link
                    to="/teacher/attendance"
                    state={{ preselectedClassId: cls.id }}
                    className={cls.isMarked ? 'btn-secondary' : 'btn-primary'}
                    style={{
                      padding: '0.5rem 0.95rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    <span>{cls.isMarked ? 'Review / Edit' : 'Take Attendance'}</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Student Attendance Detail Modal */}
      <StudentAttendanceModal
        isOpen={!!selectedStudentForModal}
        onClose={() => setSelectedStudentForModal(null)}
        studentData={selectedStudentForModal}
      />
        </>
      )}
    </div>
  );
};