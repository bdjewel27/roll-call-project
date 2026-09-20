import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
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
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const TeacherDashboard = () => {
  const { user } = useAuth();
  const [todayDate] = useState(getTodayDateString());
  const [assignedClassesStatus, setAssignedClassesStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summaryStats, setSummaryStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    markedClasses: 0,
    overallRate: 0,
  });

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
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
    setLoading(false);
  }, [user, todayDate]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-primary)' }}>
            Welcome back, {user?.fullName || 'Teacher'}
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
            Faculty Workspace &middot; Today is {formatDate(todayDate)}
          </p>
        </div>

        <Link
          to="/teacher/attendance"
          style={{
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            padding: '0.65rem 1.15rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.9rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: 'var(--shadow-sm)',
            textDecoration: 'none',
          }}
        >
          <span>Take Attendance</span>
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <Card style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <School size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>My Assigned Classes</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {summaryStats.totalClasses} <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>classes</span>
            </div>
          </div>
        </Card>

        <Card style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--status-present-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--status-present)',
            }}
          >
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Students</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {summaryStats.totalStudents} <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>students</span>
            </div>
          </div>
        </Card>

        <Card style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor:
                summaryStats.markedClasses === summaryStats.totalClasses && summaryStats.totalClasses > 0
                  ? 'var(--status-present-bg)'
                  : 'var(--status-late-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color:
                summaryStats.markedClasses === summaryStats.totalClasses && summaryStats.totalClasses > 0
                  ? 'var(--status-present)'
                  : 'var(--status-late)',
            }}
          >
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Today's Roll Call</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {summaryStats.markedClasses} / {summaryStats.totalClasses}{' '}
              <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>completed</span>
            </div>
          </div>
        </Card>

        <Card style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Average Attendance</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {summaryStats.overallRate}%
            </div>
          </div>
        </Card>
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
                    {cls.room || 'Classroom'} &bull; {cls.studentCount || 0} Students enrolled
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: cls.isMarked
                        ? 'var(--status-present-bg)'
                        : 'var(--status-late-bg)',
                      color: cls.isMarked
                        ? 'var(--status-present-text)'
                        : 'var(--status-late-text)',
                      border: `1px solid ${
                        cls.isMarked
                          ? 'var(--status-present-border)'
                          : 'var(--status-late-border)'
                      }`,
                    }}
                  >
                    {cls.isMarked ? '✓ Completed Today' : '● Roll Call Pending'}
                  </span>

                  <Link
                    to="/teacher/attendance"
                    state={{ preselectedClassId: cls.id }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: cls.isMarked ? 'var(--bg-card)' : 'var(--primary)',
                      color: cls.isMarked ? 'var(--text-primary)' : '#ffffff',
                      border: cls.isMarked ? '1px solid var(--border-color)' : 'none',
                      padding: '0.5rem 0.95rem',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontSize: '0.85rem',
                      fontWeight: 500,
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
    </div>
  );
};