import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { dataService } from '../../services/dataService';
import { ATTENDANCE_STATUS } from '../../constants/attendanceStatus';
import { getTodayDateString, formatDate } from '../../utils/formatters';
import { Link } from 'react-router-dom';
import {
  School,
  Users,
  GraduationCap,
  CalendarCheck,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

export const AdminDashboard = () => {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [todayDate] = useState(getTodayDateString());
  const [classAttendanceStatus, setClassAttendanceStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [breakdown, setBreakdown] = useState({
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    total: 0,
  });

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clsList, tchList, stdList, todayLogs] = await Promise.all([
        dataService.getClasses(),
        dataService.getTeachers(),
        dataService.getStudents(),
        dataService.getAttendanceHistory(null, todayDate, todayDate),
      ]);

      setClasses(clsList);
      setTeachers(tchList);
      setStudents(stdList);

      const historyMap = {};
      (todayLogs || []).forEach((log) => {
        if (log.classId) {
          historyMap[log.classId] = log;
        }
      });

      let pres = 0;
      let abs = 0;
      let lat = 0;
      let lev = 0;
      let tot = 0;

      const statuses = clsList.map((cls) => {
        const record = historyMap[cls.id] || null;
        const isMarked = !!record && Array.isArray(record.students) && record.students.length > 0;
        if (isMarked) {
          record.students.forEach((s) => {
            tot++;
            if (s.status === ATTENDANCE_STATUS.PRESENT) pres++;
            else if (s.status === ATTENDANCE_STATUS.ABSENT) abs++;
            else if (s.status === ATTENDANCE_STATUS.LATE) lat++;
            else if (s.status === ATTENDANCE_STATUS.LEAVE) lev++;
          });
        }
        return {
          ...cls,
          isMarked,
          record,
        };
      });

      setClassAttendanceStatus(statuses);
      setBreakdown({
        present: pres,
        absent: abs,
        late: lat,
        leave: lev,
        total: tot,
      });
    } catch (err) {
      console.error('[AdminDashboard] Error loading live data:', err);
      setError('Unable to load institutional dashboard data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [todayDate]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const markedClassesCount = classAttendanceStatus.filter((c) => c.isMarked).length;
  const overallPct =
    breakdown.total > 0
      ? Math.round(((breakdown.present + breakdown.late) / breakdown.total) * 100)
      : 0;

  const statsCards = [
    { title: 'Total Classes', value: loading ? '—' : classes.length, icon: School, color: 'var(--primary)', bg: 'var(--primary-light)' },
    { title: 'Registered Teachers', value: loading ? '—' : teachers.length, icon: Users, color: 'var(--status-leave-text)', bg: 'var(--status-leave-bg)' },
    { title: 'Enrolled Students', value: loading ? '—' : students.length, icon: GraduationCap, color: 'var(--status-present-text)', bg: 'var(--status-present-bg)' },
    { title: "Today's Attendance Rate", value: loading ? '—' : `${overallPct}%`, icon: CalendarCheck, color: 'var(--status-late-text)', bg: 'var(--status-late-bg)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-primary)' }}>
            Institutional Administration
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
            System overview and attendance tracking &middot; {formatDate(todayDate)}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link
            to="/admin/classes"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Plus size={15} />
            <span>Add Class</span>
          </Link>

          <Link
            to="/admin/teachers"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Plus size={15} />
            <span>Add Teacher</span>
          </Link>

          <Link
            to="/admin/students"
            style={{
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Plus size={15} />
            <span>Enroll Student</span>
          </Link>
        </div>
      </div>

      {error ? (
        <Card style={{ textAlign: 'center', padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--status-absent-bg)',
              color: 'var(--status-absent-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertCircle size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
              Unable to Load Dashboard Data
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '420px' }}>
              {error}
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadDashboardData()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              padding: '0.55rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              border: 'none',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <RotateCcw size={15} />
            <span>Retry</span>
          </button>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {statsCards.map((s, idx) => (
              <StatCard
                key={idx}
                icon={s.icon}
                title={s.title}
                value={s.value}
                iconColor={s.color}
                iconBg={s.bg}
              />
            ))}
          </div>

          {/* Today's Status Breakdown */}
          <Card
            title="Today's Institution Attendance"
            subtitle={loading ? "Loading today's attendance..." : `Recorded across ${markedClassesCount} of ${classes.length} active classes`}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
              <div
                style={{
                  border: `1px solid ${!loading && breakdown.present > 0 ? 'var(--status-present-border)' : 'var(--border-color)'}`,
                  backgroundColor: !loading && breakdown.present > 0 ? 'var(--status-present-bg)' : 'var(--bg-card)',
                  borderRadius: '10px',
                  padding: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <StatusBadge status="present" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: !loading && breakdown.present > 0 ? 'var(--status-present-text)' : 'var(--text-secondary)' }}>
                    {loading ? '—' : `${breakdown.total > 0 ? Math.round((breakdown.present / breakdown.total) * 100) : 0}%`}
                  </span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: !loading && breakdown.present > 0 ? 'var(--status-present-text)' : 'var(--text-secondary)', marginTop: '0.4rem' }}>
                  {loading ? '—' : breakdown.present} <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>{breakdown.present === 1 ? 'student' : 'students'}</span>
                </div>
              </div>

              <div
                style={{
                  border: `1px solid ${!loading && breakdown.absent > 0 ? 'var(--status-absent-border)' : 'var(--border-color)'}`,
                  backgroundColor: !loading && breakdown.absent > 0 ? 'var(--status-absent-bg)' : 'var(--bg-card)',
                  borderRadius: '10px',
                  padding: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <StatusBadge status="absent" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: !loading && breakdown.absent > 0 ? 'var(--status-absent-text)' : 'var(--text-secondary)' }}>
                    {loading ? '—' : `${breakdown.total > 0 ? Math.round((breakdown.absent / breakdown.total) * 100) : 0}%`}
                  </span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: !loading && breakdown.absent > 0 ? 'var(--status-absent-text)' : 'var(--text-secondary)', marginTop: '0.4rem' }}>
                  {loading ? '—' : breakdown.absent} <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>{breakdown.absent === 1 ? 'student' : 'students'}</span>
                </div>
              </div>

              <div
                style={{
                  border: `1px solid ${!loading && breakdown.late > 0 ? 'var(--status-late-border)' : 'var(--border-color)'}`,
                  backgroundColor: !loading && breakdown.late > 0 ? 'var(--status-late-bg)' : 'var(--bg-card)',
                  borderRadius: '10px',
                  padding: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <StatusBadge status="late" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: !loading && breakdown.late > 0 ? 'var(--status-late-text)' : 'var(--text-secondary)' }}>
                    {loading ? '—' : `${breakdown.total > 0 ? Math.round((breakdown.late / breakdown.total) * 100) : 0}%`}
                  </span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: !loading && breakdown.late > 0 ? 'var(--status-late-text)' : 'var(--text-secondary)', marginTop: '0.4rem' }}>
                  {loading ? '—' : breakdown.late} <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>{breakdown.late === 1 ? 'student' : 'students'}</span>
                </div>
              </div>

              <div
                style={{
                  border: `1px solid ${!loading && breakdown.leave > 0 ? 'var(--status-leave-border)' : 'var(--border-color)'}`,
                  backgroundColor: !loading && breakdown.leave > 0 ? 'var(--status-leave-bg)' : 'var(--bg-card)',
                  borderRadius: '10px',
                  padding: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <StatusBadge status="leave" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: !loading && breakdown.leave > 0 ? 'var(--status-leave-text)' : 'var(--text-secondary)' }}>
                    {loading ? '—' : `${breakdown.total > 0 ? Math.round((breakdown.leave / breakdown.total) * 100) : 0}%`}
                  </span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: !loading && breakdown.leave > 0 ? 'var(--status-leave-text)' : 'var(--text-secondary)', marginTop: '0.4rem' }}>
                  {loading ? '—' : breakdown.leave} <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>{breakdown.leave === 1 ? 'student' : 'students'}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Class Roll Call Status Table */}
          <Card title="Today's Class Roll Call Progress" subtitle={loading ? "Loading classes..." : "Monitor whether teachers have submitted daily attendance"}>
            {loading ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading classes and roll call status...
              </div>
            ) : classAttendanceStatus.length === 0 ? (
              <EmptyState
                icon={School}
                title="No classes created yet"
                description="Add classes to begin tracking attendance."
              />
            ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Class Name</th>
                  <th>Room</th>
                  <th>Enrolled</th>
                  <th>Assigned Teachers</th>
                  <th>Roll Call Status</th>
                </tr>
              </thead>
              <tbody>
                {classAttendanceStatus.map((cls) => {
                  const assignedTeachersList = teachers
                    .filter((t) => (cls.assignedTeacherIds || []).includes(t.id))
                    .map((t) => t.name);

                  return (
                    <tr key={cls.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cls.name}</td>
                      <td>{cls.room || 'Classroom'}</td>
                      <td>{cls.studentCount || 0} {(cls.studentCount || 0) === 1 ? 'student' : 'students'}</td>
                      <td>
                        {assignedTeachersList.length > 0 ? (
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {assignedTeachersList.map((tName) => (
                              <span
                                key={tName}
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '6px',
                                  backgroundColor: 'var(--bg-subtle)',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--border-color)',
                                }}
                              >
                                {tName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--status-absent-text)' }}>
                            No Teacher Assigned
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: cls.isMarked ? 'var(--status-present-bg)' : 'var(--status-late-bg)',
                            color: cls.isMarked ? 'var(--status-present-text)' : 'var(--status-late-text)',
                            border: `1px solid ${cls.isMarked ? 'var(--status-present-border)' : 'var(--status-late-border)'}`,
                          }}
                        >
                          {cls.isMarked ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                          <span>{cls.isMarked ? 'Marked Today' : 'Pending Roll Call'}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
        </>
      )}
    </div>
  );
};
