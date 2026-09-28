import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { dataService } from '../../services/dataService';
import { formatDate, getTodayDateString } from '../../utils/formatters';
import { exportAttendanceHistoryCSV } from '../../utils/csvExport';
import { ATTENDANCE_BENCHMARK } from '../../constants/attendanceStatus';
import { Link } from 'react-router-dom';
import {
  History,
  Eye,
  Edit3,
  Download,
} from 'lucide-react';

export const AttendanceHistory = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [historyLogs, setHistoryLogs] = useState([]);
  const [selectedSessionForModal, setSelectedSessionForModal] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const logs = await dataService.getAttendanceHistory(
        selectedClassId === 'ALL' ? null : selectedClassId,
        startDate || null,
        endDate || null
      );
      setHistoryLogs(logs);
    } catch (err) {
      console.error('[AttendanceHistory] Error loading history:', err);
      showToast('Error loading attendance history', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, startDate, endDate, showToast]);

  useEffect(() => {
    let isMounted = true;
    const loadInitData = async () => {
      try {
        const teacherId = user?.id || null;
        let teacherClasses = await dataService.getClassesForTeacher(teacherId);
        if (isMounted) {
          setClasses(teacherClasses);
        }
      } catch (err) {
        console.error('[AttendanceHistory] Error loading classes:', err);
        showToast('Error loading assigned classes', 'error');
      }
    };
    loadInitData();
    return () => {
      isMounted = false;
    };
  }, [user, showToast]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleOpenDetail = (session) => {
    setSelectedSessionForModal(session);
  };

  // Export to CSV with format: Date, Class, Roll No, Student Name, Status, Remarks
  const handleExportCSV = () => {
    if (historyLogs.length === 0) {
      showToast('No attendance records to export', 'error');
      return;
    }

    const filename = `Attendance_History_${selectedClassId !== 'ALL' ? selectedClassId : 'All'}_${getTodayDateString()}.csv`;
    exportAttendanceHistoryCSV(filename, historyLogs);
    showToast('Attendance history exported to CSV successfully!', 'success');
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Attendance History
          </h1>
          <p className="page-subtitle">
            Historical roll call sessions, student attendance registries, and records
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={historyLogs.length === 0}
          className="btn-primary"
          style={{
            padding: '0.65rem 1.15rem',
            fontSize: '0.9rem',
          }}
        >
          <Download size={16} />
          <span>Export to CSV</span>
        </button>
      </div>

      {/* Filters Card */}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label htmlFor="history-class-filter" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Filter by Class
            </label>
            <select
              id="history-class-filter"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="ALL">All Assigned Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="history-start-date" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              From Date
            </label>
            <input
              id="history-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label htmlFor="history-end-date" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              To Date
            </label>
            <input
              id="history-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                setSelectedClassId('ALL');
                setStartDate('');
                setEndDate('');
              }}
              className="btn-secondary"
              style={{ width: '100%', padding: '0.6rem' }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </Card>

      {/* History Table */}
      <Card title="Past Roll Call Sessions" subtitle={loading ? 'Loading sessions...' : `Showing ${historyLogs.length} logged ${historyLogs.length === 1 ? 'session' : 'sessions'}`}>
        {historyLogs.length === 0 ? (
          <EmptyState
            icon={History}
            title="No past roll call sessions found"
            description="No attendance records match your filter criteria. Try expanding your date range or selecting a different class."
          />
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Session Date</th>
                  <th>Class</th>
                  <th>Total</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Late</th>
                  <th>Leave</th>
                  <th>Rate</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {historyLogs.map((log) => (
                  <tr key={`${log.classId}_${log.date}`}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {formatDate(log.date)}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{log.className}</span>
                    </td>
                    <td>{log.stats.total}</td>
                    <td>
                      <span style={{ color: 'var(--status-present-text)', fontWeight: 700 }}>
                        {log.stats.present}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--status-absent-text)', fontWeight: 700 }}>
                        {log.stats.absent}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--status-late-text)', fontWeight: 700 }}>
                        {log.stats.late}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--status-leave-text)', fontWeight: 700 }}>
                        {log.stats.leave}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: log.stats.rate >= ATTENDANCE_BENCHMARK.AT_RISK_THRESHOLD ? 'var(--status-present-text)' : 'var(--status-absent-text)',
                        }}
                      >
                        {log.stats.rate}%
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(log)}
                          title="View Roll Call Roster"
                          className="btn-action btn-action-edit"
                        >
                          <Eye size={14} />
                          <span>Roster</span>
                        </button>

                        <Link
                          to="/teacher/attendance"
                          state={{ preselectedClassId: log.classId, preselectedDate: log.date }}
                          title="Edit Session in Take Attendance"
                          className="btn-action"
                          style={{
                            backgroundColor: 'var(--primary-light)',
                            color: 'var(--primary-text)',
                            borderColor: 'var(--border-color)',
                            fontWeight: 500,
                          }}
                        >
                          <Edit3 size={14} />
                          <span>Edit</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Session Drilldown Modal */}
      <Modal
        isOpen={!!selectedSessionForModal}
        onClose={() => setSelectedSessionForModal(null)}
        title={
          selectedSessionForModal
            ? `${selectedSessionForModal.className} — ${formatDate(selectedSessionForModal.date)}`
            : 'Session Roll Call'
        }
        maxWidth="640px"
      >
        {selectedSessionForModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Quick stats ribbon inside modal */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
              <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'var(--status-present-bg)', color: 'var(--status-present-text)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>PRESENT</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{selectedSessionForModal.stats.present}</div>
              </div>
              <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'var(--status-absent-bg)', color: 'var(--status-absent-text)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>ABSENT</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{selectedSessionForModal.stats.absent}</div>
              </div>
              <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'var(--status-late-bg)', color: 'var(--status-late-text)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>LATE</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{selectedSessionForModal.stats.late}</div>
              </div>
              <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'var(--status-leave-bg)', color: 'var(--status-leave-text)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>LEAVE</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{selectedSessionForModal.stats.leave}</div>
              </div>
            </div>

            <div className="table-responsive" style={{ maxHeight: '350px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Roll #</th>
                    <th>Student Name</th>
                    <th>Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSessionForModal.students.map((st) => (
                    <tr key={st.studentId}>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{st.rollNo}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{st.studentName}</td>
                      <td>
                        <StatusBadge status={st.status} />
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {st.remark || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
