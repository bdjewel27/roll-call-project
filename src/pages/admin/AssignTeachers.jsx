import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../context/ToastContext';
import { dataService } from '../../services/dataService';
import {
  UserCheck,
  Users,
  Plus,
  X,
  Search,
} from 'lucide-react';

export const AssignTeachers = () => {
  const { showToast } = useToast();
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassForAssign, setSelectedClassForAssign] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [clsList, tchList] = await Promise.all([
        dataService.getClasses(),
        dataService.getTeachers(),
      ]);
      setClasses(clsList);
      setTeachers(tchList);
    } catch (err) {
      console.error('[AssignTeachers] Error loading data:', err);
      showToast('Failed to load classes and teachers', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssign = async (classId, teacherId) => {
    try {
      await dataService.assignTeacherToClass(classId, teacherId);
      const teacher = teachers.find((t) => t.id === teacherId);
      showToast(`Assigned ${teacher ? teacher.name : 'Teacher'} to class!`, 'success');
      loadData();
    } catch (err) {
      console.error(err);
      showToast('Error assigning teacher to class', 'error');
    }
  };

  const handleUnassign = async (classId, teacherId) => {
    try {
      await dataService.unassignTeacherFromClass(classId, teacherId);
      const teacher = teachers.find((t) => t.id === teacherId);
      showToast(`Unassigned ${teacher ? teacher.name : 'Teacher'} from class`, 'info');
      loadData();
    } catch (err) {
      console.error(err);
      showToast('Error unassigning teacher from class', 'error');
    }
  };

  const filteredClasses = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.room && c.room.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-primary)' }}>
          Assign Teachers to Classes
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
          Grant teachers roll call permissions by linking them to designated classes
        </p>
      </div>

      {/* Search and Overview */}
      <Card
        title="Class Assignment Matrix"
        subtitle={`Managing ${classes.length} classes and ${teachers.length} faculty members`}
        extra={
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '2rem', height: '36px', fontSize: '0.85rem' }}
            />
          </div>
        }
      >
        {filteredClasses.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="No classes match criteria"
            description="Try changing your search term to view classes."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            {filteredClasses.map((cls) => {
              const assignedTeachers = teachers.filter((t) =>
                (cls.assignedTeacherIds || []).includes(t.id)
              );

              return (
                <div
                  key={cls.id}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '1.1rem 1.25rem',
                    backgroundColor: 'var(--bg-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {cls.name}
                      </h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {cls.room || 'Classroom'} &bull; {cls.studentCount || 0} Students enrolled
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedClassForAssign(cls)}
                      style={{
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary-text)',
                        border: '1px solid var(--border-color)',
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      <Plus size={14} />
                      <span>Assign Teacher</span>
                    </button>
                  </div>

                  {/* Assigned teachers pill list */}
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                      ASSIGNED FACULTY:
                    </span>
                    {assignedTeachers.length === 0 ? (
                      <span style={{ fontSize: '0.825rem', color: 'var(--status-absent)', fontStyle: 'italic' }}>
                        No teachers assigned yet. Roll call cannot be taken until a teacher is assigned.
                      </span>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {assignedTeachers.map((tch) => (
                          <div
                            key={tch.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '8px',
                              backgroundColor: 'var(--bg-card)',
                              border: '1px solid var(--border-color)',
                              fontSize: '0.85rem',
                              fontWeight: 500,
                              color: 'var(--text-primary)',
                              boxShadow: 'var(--shadow-sm)',
                            }}
                          >
                            <Users size={14} color="var(--primary)" />
                            <span>{tch.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({tch.subject || 'Faculty'})</span>
                            <button
                              type="button"
                              onClick={() => handleUnassign(cls.id, tch.id)}
                              title="Unassign this teacher"
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: '2px',
                                color: 'var(--status-absent)',
                                cursor: 'pointer',
                                display: 'flex',
                                marginLeft: '2px',
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Assign Teacher Modal */}
      <Modal
        isOpen={!!selectedClassForAssign}
        onClose={() => setSelectedClassForAssign(null)}
        title={selectedClassForAssign ? `Assign Teacher to ${selectedClassForAssign.name}` : 'Assign Teacher'}
        maxWidth="500px"
      >
        {selectedClassForAssign && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Select a teacher from the directory to assign to <strong>{selectedClassForAssign.name}</strong>:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
              {teachers.map((tch) => {
                const isAlreadyAssigned = (selectedClassForAssign.assignedTeacherIds || []).includes(tch.id);
                return (
                  <div
                    key={tch.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: isAlreadyAssigned ? 'var(--primary-light)' : 'var(--bg-card)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {tch.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {tch.subject || 'Faculty'} &bull; {tch.email}
                      </div>
                    </div>

                    {isAlreadyAssigned ? (
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-text)' }}>
                        ✓ Assigned
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          handleAssign(selectedClassForAssign.id, tch.id);
                          setSelectedClassForAssign((prev) => ({
                            ...prev,
                            assignedTeacherIds: [...(prev.assignedTeacherIds || []), tch.id],
                          }));
                        }}
                        style={{
                          backgroundColor: 'var(--primary)',
                          color: '#ffffff',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}
                      >
                        Assign
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setSelectedClassForAssign(null)}
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
