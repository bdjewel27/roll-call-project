import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card } from '../../components/common/Card';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { EmptyState } from '../../components/common/EmptyState';
import { StudentAvatar } from '../../components/common/StudentAvatar';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { dataService } from '../../services/dataService';
import { ATTENDANCE_STATUS } from '../../constants/attendanceStatus';
import { getTodayDateString, formatDate, calculateAttendanceStats } from '../../utils/formatters';
import { useLocation } from 'react-router-dom';
import {
  Save,
  UserX,
  Search,
  CheckCheck,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';

export const MarkAttendance = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    () => location.state?.preselectedDate || getTodayDateString()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [rosterAttendance, setRosterAttendance] = useState([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isExistingRecord, setIsExistingRecord] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Load teacher's classes on mount
  useEffect(() => {
    let mounted = true;
    const fetchClasses = async () => {
      try {
        const teacherId = user?.id || null;
        const availableClasses = await dataService.getClassesForTeacher(teacherId);
        if (!mounted) return;
        setClasses(availableClasses);

        // If preselected from dashboard or my-classes
        const preselected = location.state?.preselectedClassId;
        if (preselected && availableClasses.some((c) => c.id === preselected)) {
          setSelectedClassId(preselected);
        } else if (availableClasses.length > 0) {
          setSelectedClassId(availableClasses[0].id);
        }

        if (location.state?.preselectedDate) {
          setSelectedDate(location.state.preselectedDate);
        }
      } catch (err) {
        console.error('[MarkAttendance] Failed to load classes for teacher:', err);
        showToast('Error loading assigned classes', 'error');
      }
    };
    fetchClasses();
    return () => { mounted = false; };
  }, [user, location.state, showToast]);

  // Load attendance or roster when class or date changes
  const loadRosterAndAttendance = useCallback(async () => {
    if (!selectedClassId) return;
    setLoading(true);
    setLoadError(false);
    try {
      const [students, existingSession] = await Promise.all([
        dataService.getStudents(selectedClassId),
        dataService.getAttendanceRecord(selectedClassId, selectedDate),
      ]);

      if (existingSession && existingSession.students && existingSession.students.length > 0) {
        setIsExistingRecord(true);
        const mapped = students.map((std) => {
          const recorded = existingSession.students.find((s) => s.studentId === std.id);
          return {
            id: std.id,
            rollNo: std.rollNo,
            name: std.name,
            gender: std.gender,
            avatarUrl: std.avatarUrl || std.avatar_url || null,
            avatar_url: std.avatar_url || std.avatarUrl || null,
            status: recorded?.status || ATTENDANCE_STATUS.PRESENT,
            remark: recorded?.remark || '',
          };
        });

        const activeStudentIds = new Set(students.map((s) => s.id));
        const historicalOnly = existingSession.students
          .filter((rec) => !activeStudentIds.has(rec.studentId))
          .map((rec) => {
            const stdInfo = rec.student || {};
            return {
              id: rec.studentId,
              rollNo: stdInfo.rollNo || '-',
              name: stdInfo.name || 'Unknown Student',
              gender: stdInfo.gender || 'Other',
              avatarUrl: stdInfo.avatarUrl || null,
              avatar_url: stdInfo.avatarUrl || null,
              status: rec.status || ATTENDANCE_STATUS.PRESENT,
              remark: rec.remark || '',
              isInactive: true,
            };
          });

        const combined = [...mapped, ...historicalOnly].sort((a, b) => {
          const rollA = parseInt(a.rollNo, 10);
          const rollB = parseInt(b.rollNo, 10);
          if (!isNaN(rollA) && !isNaN(rollB)) return rollA - rollB;
          return String(a.rollNo).localeCompare(String(b.rollNo));
        });

        setRosterAttendance(combined);
      } else {
        setIsExistingRecord(false);
        // Default new roll call: everyone is set to Present by default for speed
        const initial = students.map((std) => ({
          id: std.id,
          rollNo: std.rollNo,
          name: std.name,
          gender: std.gender,
          avatarUrl: std.avatarUrl || std.avatar_url || null,
          avatar_url: std.avatar_url || std.avatarUrl || null,
          status: ATTENDANCE_STATUS.PRESENT,
          remark: '',
        }));
        setRosterAttendance(initial);
      }
    } catch (err) {
      console.error('Failed to load roster/attendance:', err);
      setLoadError(true);
      setRosterAttendance([]);
      showToast('Error loading attendance roster', 'error');
    } finally {
      setLoading(false);
      setHasUnsavedChanges(false);
    }
  }, [selectedClassId, selectedDate, showToast]);

  useEffect(() => {
    loadRosterAndAttendance();
  }, [loadRosterAndAttendance]);

  const hasPushedHistoryRef = useRef(false);

  // Warn on browser tab close or refresh when unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Intercept in-app link navigation (e.g. sidebar NavLinks, logout button) when unsaved changes exist
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleNavigationClick = (e) => {
      const anchor = e.target.closest ? e.target.closest('a') : null;
      const logoutBtn = e.target.closest ? e.target.closest('button[title="Logout"]') : null;

      if (anchor) {
        const href = anchor.getAttribute('href');
        if (!href || href === window.location.hash || href === '#') return;

        const confirmLeave = window.confirm(
          'You have unsaved attendance changes. Are you sure you want to leave without saving?'
        );
        if (!confirmLeave) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        } else {
          setHasUnsavedChanges(false);
        }
      } else if (logoutBtn) {
        const confirmLeave = window.confirm(
          'You have unsaved attendance changes. Are you sure you want to leave without saving?'
        );
        if (!confirmLeave) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        } else {
          setHasUnsavedChanges(false);
        }
      }
    };

    document.addEventListener('click', handleNavigationClick, true);
    return () => {
      document.removeEventListener('click', handleNavigationClick, true);
    };
  }, [hasUnsavedChanges]);

  // Intercept browser back/forward navigation when unsaved changes exist
  useEffect(() => {
    if (!hasUnsavedChanges) {
      hasPushedHistoryRef.current = false;
      return;
    }

    if (!hasPushedHistoryRef.current) {
      hasPushedHistoryRef.current = true;
      window.history.pushState(null, '', window.location.href);
    }

    const handlePopState = () => {
      const confirmLeave = window.confirm(
        'You have unsaved attendance changes. Are you sure you want to leave without saving?'
      );
      if (!confirmLeave) {
        window.history.pushState(null, '', window.location.href);
      } else {
        hasPushedHistoryRef.current = false;
        setHasUnsavedChanges(false);
        window.history.back();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges]);

  // Warn before switching classes with unsaved changes
  const handleClassChange = (newClassId) => {
    if (newClassId === selectedClassId) return;
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        'You have unsaved attendance changes. Are you sure you want to switch classes without saving?'
      );
      if (!confirmLeave) return;
    }
    setLoadError(false);
    setSelectedClassId(newClassId);
  };

  // Warn before changing dates with unsaved changes
  const handleDateChange = (newDate) => {
    if (newDate === selectedDate) return;
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        'You have unsaved attendance changes. Are you sure you want to change the date without saving?'
      );
      if (!confirmLeave) return;
    }
    setLoadError(false);
    setSelectedDate(newDate);
  };

  // Handle single student status change
  const handleStatusChange = (studentId, status) => {
    setRosterAttendance((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status } : s))
    );
    setHasUnsavedChanges(true);
  };

  // Handle remark change
  const handleRemarkChange = (studentId, remark) => {
    setRosterAttendance((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, remark } : s))
    );
    setHasUnsavedChanges(true);
  };

  // Batch action: Mark All
  const handleMarkAll = (status) => {
    setRosterAttendance((prev) => prev.map((s) => ({ ...s, status })));
    setHasUnsavedChanges(true);
  };

  // Reset to default
  const handleReset = () => {
    setRosterAttendance((prev) =>
      prev.map((s) => ({ ...s, status: ATTENDANCE_STATUS.PRESENT, remark: '' }))
    );
    setHasUnsavedChanges(true);
  };

  // Save execution
  const executeSave = async () => {
    setSaving(true);
    try {
      const records = rosterAttendance.map((s) => ({
        studentId: s.id,
        status: s.status,
        remark: s.remark,
      }));

      await dataService.saveAttendance(selectedClassId, selectedDate, records, user?.id || null);
      setIsExistingRecord(true);
      setHasUnsavedChanges(false);
      showToast(`Attendance saved successfully for ${formatDate(selectedDate)}!`, 'success');
    } catch (err) {
      console.error('Save attendance error:', err);
      showToast(err.message || 'Failed to save attendance', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    if (loadError || rosterAttendance.length === 0) return;
    if (selectedDate !== getTodayDateString() && isExistingRecord) {
      setIsConfirmOpen(true);
    } else {
      executeSave();
    }
  };

  // Statistics calculation
  const stats = useMemo(() => {
    return calculateAttendanceStats(rosterAttendance);
  }, [rosterAttendance]);

  // Search and status tab filtering
  const filteredStudents = useMemo(() => {
    const query = (searchQuery || '').toLowerCase();
    return rosterAttendance.filter((student) => {
      const matchesSearch =
        (student.name || '').toLowerCase().includes(query) ||
        String(student.rollNo ?? '').toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === 'ALL' || (student.status || '').toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rosterAttendance, searchQuery, statusFilter]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="page-container" style={{ width: '100%', minWidth: 0 }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Take Attendance
          </h1>
          <p className="page-subtitle">
            Roll call registry for <strong>Present, Absent, Late,</strong> and <strong>Leave</strong>
          </p>
        </div>

        <div className="page-header-actions">
          {isExistingRecord && (
            <span className="status-pill status-pill-marked">
              ✓ Existing Record Loaded
            </span>
          )}

          <button
            type="button"
            onClick={handleSaveClick}
            disabled={rosterAttendance.length === 0 || saving || loading || loadError}
            className="btn-primary"
            style={{
              padding: '0.65rem 1.25rem',
              fontSize: '0.9rem',
            }}
          >
            <Save size={18} />
            <span>{saving ? 'Saving...' : (hasUnsavedChanges ? 'Save Changes' : 'Save Attendance')}</span>
          </button>
        </div>
      </div>

      {/* Class & Date Controls */}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div>
            <label htmlFor="attendance-class-select" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Select Class
            </label>
            <select
              id="attendance-class-select"
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              style={{ width: '100%' }}
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.room || 'Classroom'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="attendance-date-input" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Attendance Date
            </label>
            <input
              id="attendance-date-input"
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Quick Roll Call Actions:
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleMarkAll(ATTENDANCE_STATUS.PRESENT)}
                disabled={loading || loadError || rosterAttendance.length === 0}
                className="status-toggle-btn status-present-active"
                style={{ padding: '0.45rem 0.75rem' }}
              >
                <CheckCheck size={14} />
                <span>Mark All Present</span>
              </button>

              <button
                type="button"
                onClick={() => handleMarkAll(ATTENDANCE_STATUS.ABSENT)}
                disabled={loading || loadError || rosterAttendance.length === 0}
                className="status-toggle-btn status-absent-active"
                style={{ padding: '0.45rem 0.75rem' }}
              >
                <UserX size={14} />
                <span>Mark All Absent</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={loading || loadError || rosterAttendance.length === 0}
                title="Reset statuses"
                className="btn-action btn-action-edit"
                style={{ padding: '0.45rem 0.75rem' }}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Real-time Summary Ribbon */}
      <div className="stat-ribbon">
        <div className="stat-ribbon-tile">
          <div className="stat-ribbon-label">TOTAL STUDENTS</div>
          <div className="stat-ribbon-val">{stats.total}</div>
        </div>

        <div className={`stat-ribbon-tile ${stats.present > 0 ? 'status-present-active' : ''}`}>
          <div className="stat-ribbon-label">PRESENT</div>
          <div className="stat-ribbon-val">{stats.present}</div>
        </div>

        <div className={`stat-ribbon-tile ${stats.absent > 0 ? 'status-absent-active' : ''}`}>
          <div className="stat-ribbon-label">ABSENT</div>
          <div className="stat-ribbon-val">{stats.absent}</div>
        </div>

        <div className={`stat-ribbon-tile ${stats.late > 0 ? 'status-late-active' : ''}`}>
          <div className="stat-ribbon-label">LATE</div>
          <div className="stat-ribbon-val">{stats.late}</div>
        </div>

        <div className={`stat-ribbon-tile ${stats.leave > 0 ? 'status-leave-active' : ''}`}>
          <div className="stat-ribbon-label">LEAVE</div>
          <div className="stat-ribbon-val">{stats.leave}</div>
        </div>

        <div className="stat-ribbon-tile">
          <div className="stat-ribbon-label">ATTENDANCE RATE</div>
          <div className="stat-ribbon-val" style={{ color: 'var(--primary)' }}>{stats.percentage}%</div>
        </div>
      </div>

      {/* Roster & Filter Tools */}
      <Card
        title={`${selectedClass?.name || 'Class'} Roll Call`}
        subtitle={`Marking session for ${formatDate(selectedDate)}`}
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', maxWidth: '100%' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2rem', height: '36px', fontSize: '0.85rem' }}
              />
            </div>

            {/* Status Tabs */}
            <div className="filter-tabs-wrapper">
              {['ALL', 'PRESENT', 'ABSENT', 'LATE', 'LEAVE'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  aria-pressed={statusFilter === tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`filter-tab ${statusFilter === tab ? 'active' : ''}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        }
      >
        {loading ? (
          <div className="table-responsive">
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Roll #</th>
                  <th>Student Name</th>
                  <th style={{ minWidth: '320px' }}>Attendance Status</th>
                  <th style={{ minWidth: '220px' }}>Remarks / Reason</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td>
                      <div style={{ width: '40px', height: '16px', borderRadius: '4px', backgroundColor: 'var(--border-color)' }} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--border-color)', flexShrink: 0 }} />
                        <div>
                          <div style={{ width: '120px', height: '16px', borderRadius: '4px', backgroundColor: 'var(--border-color)', marginBottom: '4px' }} />
                          <div style={{ width: '60px', height: '12px', borderRadius: '4px', backgroundColor: 'var(--border-color)' }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {[1, 2, 3, 4].map((pill) => (
                          <div key={pill} style={{ width: '70px', height: '30px', borderRadius: '6px', backgroundColor: 'var(--border-color)' }} />
                        ))}
                      </div>
                    </td>
                    <td>
                      <div style={{ width: '100%', height: '36px', borderRadius: '6px', backgroundColor: 'var(--border-color)' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : loadError ? (
          <div className="error-state-card">
            <div className="error-state-icon">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="error-state-title">
                Unable to Load Attendance Records
              </h3>
              <p className="error-state-desc">
                A network or server error occurred while retrieving attendance for this session. Existing records have not been altered.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadRosterAndAttendance()}
              className="btn-primary"
            >
              <RotateCcw size={15} />
              <span>Retry</span>
            </button>
          </div>
        ) : filteredStudents.length === 0 ? (
          <EmptyState
            title="No students match criteria"
            description="Try clearing your search query or switching your status filter tab."
          />
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Roll #</th>
                  <th>Student Name</th>
                  <th style={{ minWidth: '320px' }}>Attendance Status</th>
                  <th style={{ minWidth: '220px' }}>Remarks / Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  return (
                    <tr key={student.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {student.rollNo}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <StudentAvatar student={student} shape="circle" />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {student.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {student.gender || 'Student'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {/* 4-Status Pill Toggles */}
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {/* Present */}
                          <button
                            type="button"
                            aria-pressed={student.status === ATTENDANCE_STATUS.PRESENT}
                            onClick={() => handleStatusChange(student.id, ATTENDANCE_STATUS.PRESENT)}
                            className={`status-toggle-btn ${student.status === ATTENDANCE_STATUS.PRESENT ? 'status-present-active' : ''}`}
                          >
                            Present
                          </button>

                          {/* Absent */}
                          <button
                            type="button"
                            aria-pressed={student.status === ATTENDANCE_STATUS.ABSENT}
                            onClick={() => handleStatusChange(student.id, ATTENDANCE_STATUS.ABSENT)}
                            className={`status-toggle-btn ${student.status === ATTENDANCE_STATUS.ABSENT ? 'status-absent-active' : ''}`}
                          >
                            Absent
                          </button>

                          {/* Late */}
                          <button
                            type="button"
                            aria-pressed={student.status === ATTENDANCE_STATUS.LATE}
                            onClick={() => handleStatusChange(student.id, ATTENDANCE_STATUS.LATE)}
                            className={`status-toggle-btn ${student.status === ATTENDANCE_STATUS.LATE ? 'status-late-active' : ''}`}
                          >
                            Late
                          </button>

                          {/* Leave */}
                          <button
                            type="button"
                            aria-pressed={student.status === ATTENDANCE_STATUS.LEAVE}
                            onClick={() => handleStatusChange(student.id, ATTENDANCE_STATUS.LEAVE)}
                            className={`status-toggle-btn ${student.status === ATTENDANCE_STATUS.LEAVE ? 'status-leave-active' : ''}`}
                          >
                            Leave
                          </button>
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          placeholder={
                            student.status === ATTENDANCE_STATUS.LATE
                              ? 'e.g. Arrived 8:20 AM'
                              : student.status === ATTENDANCE_STATUS.LEAVE
                              ? 'e.g. Medical leave'
                              : 'Optional remark...'
                          }
                          value={student.remark}
                          onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.4rem 0.65rem',
                            fontSize: '0.825rem',
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Confirmation modal for overwriting past records */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeSave}
        title="Update Past Attendance?"
        message={`You are modifying an existing attendance record for ${formatDate(
          selectedDate
        )}. Are you sure you want to overwrite it?`}
        confirmText="Yes, Overwrite"
        isDanger={false}
      />
    </div>
  );
};
