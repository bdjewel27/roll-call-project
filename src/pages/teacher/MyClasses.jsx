import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { dataService } from '../../services/dataService';
import { getTodayDateString } from '../../utils/formatters';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Users,
  ClipboardCheck,
  Eye,
  Search,
  School,
  MapPin,
  Calendar,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

export const MyClasses = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClassForRoster, setSelectedClassForRoster] = useState(null);
  const [rosterStudents, setRosterStudents] = useState([]);
  const [rosterSearch, setRosterSearch] = useState('');
  const todayDate = getTodayDateString();

  const loadClasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const teacherId = user?.id || null;
      const [list, todayLogs] = await Promise.all([
        dataService.getClassesForTeacher(teacherId),
        dataService.getAttendanceHistory(null, todayDate, todayDate),
      ]);

      const historyMap = {};
      (todayLogs || []).forEach((log) => {
        if (log.classId) {
          historyMap[log.classId] = log;
        }
      });

      const enriched = list.map((cls) => {
        const todayRecord = historyMap[cls.id] || null;
        return {
          ...cls,
          isMarked: !!todayRecord && Array.isArray(todayRecord.students) && todayRecord.students.length > 0,
        };
      });

      setClasses(enriched);
    } catch (err) {
      console.error('[MyClasses] Error loading classes:', err);
      setError('Unable to load your assigned classes. Please check your network connection and try again.');
      showToast('Failed to load assigned classes', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, todayDate, showToast]);

  useEffect(() => {
    const fetch = async () => {
      await loadClasses();
    };
    fetch();
  }, [loadClasses]);

  const handleOpenRoster = async (cls) => {
    setSelectedClassForRoster(cls);
    try {
      const students = await dataService.getStudents(cls.id);
      setRosterStudents(students);
    } catch (err) {
      console.error('[MyClasses] Error loading roster:', err);
      setRosterStudents([]);
      showToast('Failed to load class roster', 'error');
    }
    setRosterSearch('');
  };

  const query = (rosterSearch || '').toLowerCase();
  const filteredRoster = rosterStudents.filter(
    (s) =>
      (s.name || '').toLowerCase().includes(query) ||
      String(s.rollNo ?? '').toLowerCase().includes(query)
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div>
        <h1 className="page-title">
          My Classes
        </h1>
        <p className="page-subtitle">
          Overview of your assigned academic classes and enrolled student rosters
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {[1, 2, 3].map((idx) => (
            <Card key={idx} className="animate-pulse" style={{ height: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ width: '60%', height: '20px', borderRadius: '4px', backgroundColor: 'var(--border-color)', marginBottom: '10px' }} />
                <div style={{ width: '40%', height: '14px', borderRadius: '4px', backgroundColor: 'var(--border-color)' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <div style={{ flex: 1, height: '36px', borderRadius: '8px', backgroundColor: 'var(--border-color)' }} />
                <div style={{ flex: 1, height: '36px', borderRadius: '8px', backgroundColor: 'var(--border-color)' }} />
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <div className="error-state-card">
            <div className="error-state-icon">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="error-state-title">
                Unable to Load Classes
              </h3>
              <p className="error-state-desc">
                {error}
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadClasses()}
              className="btn-primary"
            >
              <RotateCcw size={15} />
              <span>Retry</span>
            </button>
          </div>
        </Card>
      ) : classes.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="No classes assigned"
            description="You are not currently assigned as a primary teacher to any active classes. Contact an administrator for assignments."
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {classes.map((cls) => {
            const isMarked = !!cls.isMarked;

            return (
              <Card
                key={cls.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div className="icon-box-primary">
                      <School size={22} />
                    </div>
                    <span className={`status-pill ${isMarked ? 'status-pill-marked' : 'status-pill-pending'}`}>
                      {isMarked ? 'Marked Today' : 'Pending Today'}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {cls.name}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MapPin size={14} color="var(--text-muted)" />
                      <span>{cls.room || 'Main Building'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={14} color="var(--text-muted)" />
                      <span>Academic Year {cls.academicYear || '2026-2027'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={14} color="var(--text-muted)" />
                      <span>{cls.studentCount || 0} {(cls.studentCount || 0) === 1 ? 'Enrolled Student' : 'Enrolled Students'}</span>
                    </div>
                  </div>
                </div>

                <div className="card-footer-actions">
                  <button
                    type="button"
                    onClick={() => handleOpenRoster(cls)}
                    className="btn-secondary"
                    style={{
                      flex: 1,
                      fontSize: '0.85rem',
                    }}
                  >
                    <Eye size={15} />
                    <span>View Roster</span>
                  </button>

                  <Link
                    to="/teacher/attendance"
                    state={{ preselectedClassId: cls.id }}
                    className="btn-primary"
                    style={{
                      flex: 1,
                      fontSize: '0.85rem',
                    }}
                  >
                    <ClipboardCheck size={15} />
                    <span>{isMarked ? 'Review' : 'Roll Call'}</span>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Class Roster Modal */}
      <Modal
        isOpen={!!selectedClassForRoster}
        onClose={() => setSelectedClassForRoster(null)}
        title={selectedClassForRoster ? `${selectedClassForRoster.name} - Student Roster` : 'Class Roster'}
        maxWidth="640px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Search inside roster */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search student by name or roll number..."
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '2rem' }}
            />
          </div>

          <div className="table-responsive" style={{ maxHeight: '380px' }}>
            <table>
              <thead>
                <tr>
                  <th>Roll #</th>
                  <th>Student Name</th>
                  <th>Gender</th>
                  <th>Guardian</th>
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoster.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No students found in this roster.
                    </td>
                  </tr>
                ) : (
                  filteredRoster.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{s.rollNo}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</td>
                      <td>{s.gender || '-'}</td>
                      <td>{s.guardianName || '-'}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.guardianPhone || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
};
