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
    return rosterAttendance.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.rollNo.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || student.status.toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rosterAttendance, searchQuery, statusFilter]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', minWidth: 0 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-primary)' }}>
            Take Attendance
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
            Roll call registry for <strong>Present, Absent, Late,</strong> and <strong>Leave</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {isExistingRecord && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                backgroundColor: 'var(--status-present-bg)',
                color: 'var(--status-present-text)',
                border: '1px solid var(--status-present-border)',
              }}
            >
              ✓ Existing Record Loaded
            </span>
          )}

          <button
            type="button"
            onClick={handleSaveClick}
            disabled={rosterAttendance.length === 0 || saving || loading || loadError}
            style={{
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
              boxShadow: 'var(--shadow-sm)',
              opacity: (rosterAttendance.length === 0 || saving || loading || loadError) ? 0.6 : 1,
              cursor: (rosterAttendance.length === 0 || saving || loading || loadError) ? 'not-allowed' : 'pointer',
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
                style={{
                  backgroundColor: 'var(--status-present-bg)',
                  color: 'var(--status-present-text)',
                  border: '1px solid var(--status-present-border)',
                  fontSize: '0.8rem',
                  padding: '0.45rem 0.75rem',
                  opacity: (loading || loadError || rosterAttendance.length === 0) ? 0.5 : 1,
                  cursor: (loading || loadError || rosterAttendance.length === 0) ? 'not-allowed' : 'pointer',
                }}
              >
                <CheckCheck size={14} />
                <span>Mark All Present</span>
              </button>

              <button
                type="button"
                onClick={() => handleMarkAll(ATTENDANCE_STATUS.ABSENT)}
                disabled={loading || loadError || rosterAttendance.length === 0}
                style={{
                  backgroundColor: 'var(--status-absent-bg)',
                  color: 'var(--status-absent-text)',
                  border: '1px solid var(--status-absent-border)',
                  fontSize: '0.8rem',
                  padding: '0.45rem 0.75rem',
                  opacity: (loading || loadError || rosterAttendance.length === 0) ? 0.5 : 1,
                  cursor: (loading || loadError || rosterAttendance.length === 0) ? 'not-allowed' : 'pointer',
                }}
              >
                <UserX size={14} />
                <span>Mark All Absent</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={loading || loadError || rosterAttendance.length === 0}
                title="Reset statuses"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.8rem',
                  padding: '0.45rem 0.75rem',
                  opacity: (loading || loadError || rosterAttendance.length === 0) ? 0.5 : 1,
                  cursor: (loading || loadError || rosterAttendance.length === 0) ? 'not-allowed' : 'pointer',
                }}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Real-time Summary Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '0.85rem 1rem', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL STUDENTS</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.total}</div>
        </div>

        <div
          style={{
            backgroundColor: stats.present > 0 ? 'var(--status-present-bg)' : 'var(--bg-card)',
            border: `1px solid ${stats.present > 0 ? 'var(--status-present-border)' : 'var(--border-color)'}`,
            padding: '0.85rem 1rem',
            borderRadius: '10px',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: stats.present > 0 ? 'var(--status-present-text)' : 'var(--text-secondary)', fontWeight: 700 }}>PRESENT</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: stats.present > 0 ? 'var(--status-present-text)' : 'var(--text-primary)' }}>{stats.present}</div>
        </div>

        <div
          style={{
            backgroundColor: stats.absent > 0 ? 'var(--status-absent-bg)' : 'var(--bg-card)',
            border: `1px solid ${stats.absent > 0 ? 'var(--status-absent-border)' : 'var(--border-color)'}`,
            padding: '0.85rem 1rem',
            borderRadius: '10px',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: stats.absent > 0 ? 'var(--status-absent-text)' : 'var(--text-secondary)', fontWeight: 700 }}>ABSENT</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: stats.absent > 0 ? 'var(--status-absent-text)' : 'var(--text-primary)' }}>{stats.absent}</div>
        </div>

        <div
          style={{
            backgroundColor: stats.late > 0 ? 'var(--status-late-bg)' : 'var(--bg-card)',
            border: `1px solid ${stats.late > 0 ? 'var(--status-late-border)' : 'var(--border-color)'}`,
            padding: '0.85rem 1rem',
            borderRadius: '10px',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: stats.late > 0 ? 'var(--status-late-text)' : 'var(--text-secondary)', fontWeight: 700 }}>LATE</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: stats.late > 0 ? 'var(--status-late-text)' : 'var(--text-primary)' }}>{stats.late}</div>
        </div>

        <div
          style={{
            backgroundColor: stats.leave > 0 ? 'var(--status-leave-bg)' : 'var(--bg-card)',
            border: `1px solid ${stats.leave > 0 ? 'var(--status-leave-border)' : 'var(--border-color)'}`,
            padding: '0.85rem 1rem',
            borderRadius: '10px',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: stats.leave > 0 ? 'var(--status-leave-text)' : 'var(--text-secondary)', fontWeight: 700 }}>LEAVE</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: stats.leave > 0 ? 'var(--status-leave-text)' : 'var(--text-primary)' }}>{stats.leave}</div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '0.85rem 1rem', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ATTENDANCE RATE</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)' }}>{stats.percentage}%</div>
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
            <div
              style={{
                display: 'inline-flex',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: '8px',
                padding: '3px',
                gap: '2px',
                maxWidth: '100%',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {['ALL', 'PRESENT', 'ABSENT', 'LATE', 'LEAVE'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  aria-pressed={statusFilter === tab}
                  onClick={() => setStatusFilter(tab)}
                  style={{
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: statusFilter === tab ? 700 : 500,
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: statusFilter === tab ? 'var(--bg-card)' : 'transparent',
                    color: statusFilter === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                    boxShadow: statusFilter === tab ? 'var(--shadow-sm)' : 'none',
                    flexShrink: 0,
                  }}
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
          <div
            style={{
              padding: '3rem 1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
            }}
          >
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
                Unable to Load Attendance Records
              </h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '420px' }}>
                A network or server error occurred while retrieving attendance for this session. Existing records have not been altered.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadRosterAndAttendance()}
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
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: student.status === ATTENDANCE_STATUS.PRESENT ? 700 : 500,
                              backgroundColor:
                                student.status === ATTENDANCE_STATUS.PRESENT
                                  ? 'var(--status-present-bg)'
                                  : 'var(--bg-subtle)',
                              color:
                                student.status === ATTENDANCE_STATUS.PRESENT
                                  ? 'var(--status-present-text)'
                                  : 'var(--text-secondary)',
                              border: `1px solid ${
                                student.status === ATTENDANCE_STATUS.PRESENT
                                  ? 'var(--status-present-border)'
                                  : 'var(--border-color)'
                              }`,
                            }}
                          >
                            Present
                          </button>

                          {/* Absent */}
                          <button
                            type="button"
                            aria-pressed={student.status === ATTENDANCE_STATUS.ABSENT}
                            onClick={() => handleStatusChange(student.id, ATTENDANCE_STATUS.ABSENT)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: student.status === ATTENDANCE_STATUS.ABSENT ? 700 : 500,
                              backgroundColor:
                                student.status === ATTENDANCE_STATUS.ABSENT
                                  ? 'var(--status-absent-bg)'
                                  : 'var(--bg-subtle)',
                              color:
                                student.status === ATTENDANCE_STATUS.ABSENT
                                  ? 'var(--status-absent-text)'
                                  : 'var(--text-secondary)',
                              border: `1px solid ${
                                student.status === ATTENDANCE_STATUS.ABSENT
                                  ? 'var(--status-absent-border)'
                                  : 'var(--border-color)'
                              }`,
                            }}
                          >
                            Absent
                          </button>

                          {/* Late */}
                          <button
                            type="button"
                            aria-pressed={student.status === ATTENDANCE_STATUS.LATE}
                            onClick={() => handleStatusChange(student.id, ATTENDANCE_STATUS.LATE)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: student.status === ATTENDANCE_STATUS.LATE ? 700 : 500,
                              backgroundColor:
                                student.status === ATTENDANCE_STATUS.LATE
                                  ? 'var(--status-late-bg)'
                                  : 'var(--bg-subtle)',
                              color:
                                student.status === ATTENDANCE_STATUS.LATE
                                  ? 'var(--status-late-text)'
                                  : 'var(--text-secondary)',
                              border: `1px solid ${
                                student.status === ATTENDANCE_STATUS.LATE
                                  ? 'var(--status-late-border)'
                                  : 'var(--border-color)'
                              }`,
                            }}
                          >
                            Late
                          </button>

                          {/* Leave */}
                          <button
                            type="button"
                            aria-pressed={student.status === ATTENDANCE_STATUS.LEAVE}
                            onClick={() => handleStatusChange(student.id, ATTENDANCE_STATUS.LEAVE)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: student.status === ATTENDANCE_STATUS.LEAVE ? 700 : 500,
                              backgroundColor:
                                student.status === ATTENDANCE_STATUS.LEAVE
                                  ? 'var(--status-leave-bg)'
                                  : 'var(--bg-subtle)',
                              color:
                                student.status === ATTENDANCE_STATUS.LEAVE
                                  ? 'var(--status-leave-text)'
                                  : 'var(--text-secondary)',
                              border: `1px solid ${
                                student.status === ATTENDANCE_STATUS.LEAVE
                                  ? 'var(--status-leave-border)'
                                  : 'var(--border-color)'
                              }`,
                            }}
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
