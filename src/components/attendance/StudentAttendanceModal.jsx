import React, { useRef } from 'react';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { StudentAvatar } from '../common/StudentAvatar';
import { formatDate } from '../../utils/formatters';
import { ATTENDANCE_STATUS, ATTENDANCE_BENCHMARK } from '../../constants/attendanceStatus';
import { CheckCircle2, AlertTriangle, Calendar, FileText } from 'lucide-react';

export const StudentAttendanceModal = ({
  isOpen,
  onClose,
  studentData,
  period,
}) => {
  const closeBtnRef = useRef(null);

  if (!studentData) return null;

  const student = studentData.student || {};
  const sessions = Array.isArray(studentData.sessions) ? studentData.sessions : [];

  // Filter for dates where student was NOT present (Absent, Late, Leave)
  const nonPresentSessions = sessions
    .filter((s) => s.status && s.status !== ATTENDANCE_STATUS.PRESENT)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const isAtRisk = studentData.rate < ATTENDANCE_BENCHMARK.AT_RISK_THRESHOLD && studentData.totalSessions > 0;
  const isConsecutiveAbsent = studentData.consecutiveAbsentDays >= 3;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Attendance Details"
      maxWidth="560px"
      initialFocusRef={closeBtnRef}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Student Profile Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '1rem',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <StudentAvatar student={student} size={44} shape="circle" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {student.name || 'Unknown Student'}
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                Roll #{student.rollNo || '-'} &bull; {studentData.className || student.className || 'Class Record'}
              </p>
              {(period || studentData.period || studentData.periodDescription) && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    marginTop: '0.35rem',
                    fontSize: '0.725rem',
                    fontWeight: 600,
                    color: 'var(--primary-text)',
                    backgroundColor: 'var(--primary-light)',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <Calendar size={12} />
                  <span>{period || studentData.period || studentData.periodDescription}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: isAtRisk ? 'var(--status-absent-text)' : 'var(--status-present-text)',
              }}
            >
              {studentData.rate}%
            </span>
            <span
              style={{
                fontSize: '0.725rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                backgroundColor: isAtRisk ? 'var(--status-absent-bg)' : 'var(--status-present-bg)',
                color: isAtRisk ? 'var(--status-absent-text)' : 'var(--status-present-text)',
                border: `1px solid ${isAtRisk ? 'var(--status-absent-border)' : 'var(--status-present-border)'}`,
              }}
            >
              {isAtRisk ? '⚠ At Risk' : '✓ Good Standing'}
            </span>
          </div>
        </div>

        {/* Consecutive Absence Warning */}
        {isConsecutiveAbsent && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: 'var(--status-absent-bg)',
              border: '1px solid var(--status-absent-border)',
              color: 'var(--status-absent-text)',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>
              Urgent Alert: This student has been absent for {studentData.consecutiveAbsentDays} consecutive sessions!
            </span>
          </div>
        )}

        {/* KPI Mini-Tiles */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '0.5rem',
            textAlign: 'center',
          }}
        >
          <div style={{ padding: '0.6rem 0.4rem', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{studentData.totalSessions}</div>
          </div>
          <div style={{ padding: '0.6rem 0.4rem', borderRadius: '8px', backgroundColor: 'var(--status-present-bg)', border: '1px solid var(--status-present-border)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--status-present-text)', fontWeight: 600 }}>PRESENT</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--status-present-text)' }}>{studentData.present}</div>
          </div>
          <div style={{ padding: '0.6rem 0.4rem', borderRadius: '8px', backgroundColor: 'var(--status-absent-bg)', border: '1px solid var(--status-absent-border)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--status-absent-text)', fontWeight: 600 }}>ABSENT</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--status-absent-text)' }}>{studentData.absent}</div>
          </div>
          <div style={{ padding: '0.6rem 0.4rem', borderRadius: '8px', backgroundColor: 'var(--status-late-bg)', border: '1px solid var(--status-late-border)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--status-late-text)', fontWeight: 600 }}>LATE</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--status-late-text)' }}>{studentData.late}</div>
          </div>
          <div style={{ padding: '0.6rem 0.4rem', borderRadius: '8px', backgroundColor: 'var(--status-leave-bg)', border: '1px solid var(--status-leave-border)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--status-leave-text)', fontWeight: 600 }}>LEAVE</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--status-leave-text)' }}>{studentData.leave}</div>
          </div>
        </div>

        {/* Date-by-Date Absence Log */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Absence & Tardy History
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Total {nonPresentSessions.length} {nonPresentSessions.length === 1 ? 'day' : 'days'}
            </span>
          </div>

          {nonPresentSessions.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1.25rem',
                borderRadius: '8px',
                backgroundColor: 'var(--status-present-bg)',
                border: '1px solid var(--status-present-border)',
                color: 'var(--status-present-text)',
              }}
            >
              <CheckCircle2 size={24} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  Perfect Attendance (100% Present)
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                  No records of absence, tardiness, or leave during {period || studentData.period || studentData.periodDescription || 'the selected period'}.
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                maxHeight: '220px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                paddingRight: '4px',
              }}
            >
              {nonPresentSessions.map((sessionItem, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.85rem',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {formatDate(sessionItem.date)}
                    </span>
                    {sessionItem.className && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ({sessionItem.className})
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {sessionItem.remark ? (
                      <span
                        title={sessionItem.remark}
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          fontStyle: 'italic',
                          maxWidth: '140px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <FileText size={12} />
                        {sessionItem.remark}
                      </span>
                    ) : null}

                    <StatusBadge status={sessionItem.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '0.55rem 1.25rem', fontSize: '0.875rem' }}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
