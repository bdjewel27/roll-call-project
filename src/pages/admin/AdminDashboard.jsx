import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { dataService } from '../../services/dataService';
import { ATTENDANCE_STATUS } from '../../constants/attendanceStatus';
import { getTodayDateString, formatDate, getStudentAttendanceStatus } from '../../utils/formatters';
import { Link } from 'react-router-dom';
import { StudentAvatar } from '../../components/common/StudentAvatar';
import { StudentAttendanceModal } from '../../components/attendance/StudentAttendanceModal';
import {
  School,
  Users,
  GraduationCap,
  CalendarCheck,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export const AdminDashboard = () => {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [todayDate] = useState(getTodayDateString());
  const [classAttendanceStatus, setClassAttendanceStatus] = useState([]);
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null);
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
      const [clsList, tchList, stdList, todayLogs, studentMetrics] = await Promise.all([
        dataService.getClasses(),
        dataService.getTeachers(),
        dataService.getStudents(),
        dataService.getAttendanceHistory(null, todayDate, todayDate),
        dataService.getStudentAttendanceMetrics(null),
      ]);

      setClasses(clsList);
      setTeachers(tchList);
      setStudents(stdList);

      const flagged = (studentMetrics || []).filter(
        (m) => (m.isAtRisk || m.isConsecutiveAbsent) && m.totalSessions > 0
      );
      setAtRiskStudents(flagged);

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
    const fetch = async () => {
      await loadDashboardData();
    };
    fetch();
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
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Institutional Administration
          </h1>
          <p className="page-subtitle">
            System overview and attendance tracking &middot; {formatDate(todayDate)}
          </p>
        </div>

        <div className="page-header-actions">
          <Link to="/admin/classes" className="btn-secondary">
            <Plus size={15} />
            <span>Add Class</span>
          </Link>

          <Link to="/admin/teachers" className="btn-secondary">
            <Plus size={15} />
            <span>Add Teacher</span>
          </Link>

          <Link to="/admin/students" className="btn-primary">
            <Plus size={15} />
            <span>Enroll Student</span>
          </Link>
        </div>
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
            <div className="stat-tile-grid">
              <div className={`stat-tile stat-tile-present ${!loading && breakdown.present > 0 ? 'active-present' : ''}`}>
                <div className="stat-tile-header">
                  <StatusBadge status="present" />
                  <span className="stat-tile-pct">
                    {loading ? '—' : `${breakdown.total > 0 ? Math.round((breakdown.present / breakdown.total) * 100) : 0}%`}
                  </span>
                </div>
                <div className="stat-tile-count">
                  {loading ? '—' : breakdown.present} <span className="stat-tile-unit">{breakdown.present === 1 ? 'student' : 'students'}</span>
                </div>
              </div>

              <div className={`stat-tile stat-tile-absent ${!loading && breakdown.absent > 0 ? 'active-absent' : ''}`}>
                <div className="stat-tile-header">
                  <StatusBadge status="absent" />
                  <span className="stat-tile-pct">
                    {loading ? '—' : `${breakdown.total > 0 ? Math.round((breakdown.absent / breakdown.total) * 100) : 0}%`}
                  </span>
                </div>
                <div className="stat-tile-count">
                  {loading ? '—' : breakdown.absent} <span className="stat-tile-unit">{breakdown.absent === 1 ? 'student' : 'students'}</span>
                </div>
              </div>

              <div className={`stat-tile stat-tile-late ${!loading && breakdown.late > 0 ? 'active-late' : ''}`}>
                <div className="stat-tile-header">
                  <StatusBadge status="late" />
                  <span className="stat-tile-pct">
                    {loading ? '—' : `${breakdown.total > 0 ? Math.round((breakdown.late / breakdown.total) * 100) : 0}%`}
                  </span>
                </div>
                <div className="stat-tile-count">
                  {loading ? '—' : breakdown.late} <span className="stat-tile-unit">{breakdown.late === 1 ? 'student' : 'students'}</span>
                </div>
              </div>

              <div className={`stat-tile stat-tile-leave ${!loading && breakdown.leave > 0 ? 'active-leave' : ''}`}>
                <div className="stat-tile-header">
                  <StatusBadge status="leave" />
                  <span className="stat-tile-pct">
                    {loading ? '—' : `${breakdown.total > 0 ? Math.round((breakdown.leave / breakdown.total) * 100) : 0}%`}
                  </span>
                </div>
                <div className="stat-tile-count">
                  {loading ? '—' : breakdown.leave} <span className="stat-tile-unit">{breakdown.leave === 1 ? 'student' : 'students'}</span>
                </div>
              </div>
            </div>
          </Card>

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
                Analyzing institutional attendance patterns...
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
                {atRiskStudents.slice(0, 8).map((m) => {
                  const studentClass = classes.find((c) => c.id === m.student.classId);
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
                                className: studentClass?.name || 'Class Roster',
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
                            Roll #{m.student.rollNo} &bull; {studentClass?.name || 'Class'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        {(() => {
                          const statusInfo = getStudentAttendanceStatus(m);
                          return (
                            <>
                              {statusInfo.isConsecutiveAbsent && (
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
                                  <span>{statusInfo.consecutiveAbsentDays} Consecutive Absences</span>
                                </span>
                              )}

                              {statusInfo.isBelowThreshold && (
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
                                  {m.rate}% (Below 75%)
                                </span>
                              )}
                            </>
                          );
                        })()}

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedStudentForModal({
                              ...m,
                              className: studentClass?.name || 'Class Roster',
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
                        <span className={`status-pill ${cls.isMarked ? 'status-pill-marked' : 'status-pill-pending'}`}>
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
