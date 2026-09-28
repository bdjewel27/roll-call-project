import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../hooks/useAuth';
import { dataService } from '../../services/dataService';
import { ATTENDANCE_STATUS } from '../../constants/attendanceStatus';
import { formatDate, getTodayDateString } from '../../utils/formatters';
import { Link } from 'react-router-dom';
import {
  School,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

export const TeacherDashboard = () => {
  const { user } = useAuth();
  const [todayDate] = useState(getTodayDateString());
  const [assignedClassesStatus, setAssignedClassesStatus] = useState([]);
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
      const teacherId = user?.id || 'tch-1';

      // Fetch classes directly from Supabase via dataService
      const [teacherClasses, todayLogs] = await Promise.all([
        dataService.getClassesForTeacher(teacherId),
        dataService.getAttendanceHistory(null, todayDate, todayDate),
      ]);

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
    loadDashboardData();
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
        </>
      )}
    </div>
  );
};