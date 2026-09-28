import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../context/ToastContext';
import { dataService } from '../../services/dataService';
import { School, Plus, Search, Edit2, Trash2, AlertCircle, RotateCcw } from 'lucide-react';

export const ClassManagement = () => {
  const { showToast } = useToast();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [deleteTargetClass, setDeleteTargetClass] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    section: '',
    room: '',
    academicYear: '2026-2027',
  });

  const loadClasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await dataService.getClasses();
      setClasses(list);
    } catch (err) {
      console.error(err);
      setError('Unable to load classes. Please check your network connection and try again.');
      showToast('Failed to load classes', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const fetch = async () => {
      await loadClasses();
    };
    fetch();
  }, [loadClasses]);

  const handleOpenCreate = () => {
    setEditingClass(null);
    setFormData({
      name: '',
      grade: '',
      section: '',
      room: '',
      academicYear: '2026-2027',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cls) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      grade: cls.grade || '',
      section: cls.section || '',
      room: cls.room || '',
      academicYear: cls.academicYear || '2026-2027',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Class name is required', 'error');
      return;
    }

    try {
      if (editingClass) {
        await dataService.updateClass(editingClass.id, formData);
        showToast('Class updated successfully!', 'success');
      } else {
        await dataService.createClass(formData);
        showToast('New class created successfully!', 'success');
      }
      setIsModalOpen(false);
      loadClasses();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error saving class', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetClass) {
      try {
        await dataService.deleteClass(deleteTargetClass.id);
        showToast(`Class "${deleteTargetClass.name}" deleted`, 'success');
        setDeleteTargetClass(null);
        loadClasses();
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Error deleting class', 'error');
      }
    }
  };

  const query = (searchQuery || '').toLowerCase();
  const filteredClasses = classes.filter(
    (c) =>
      (c.name || '').toLowerCase().includes(query) ||
      Boolean(c.section && String(c.section).toLowerCase().includes(query)) ||
      Boolean(c.room && String(c.room).toLowerCase().includes(query))
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header page-header-centered">
        <div>
          <h1 className="page-title">
            Class Management
          </h1>
          <p className="page-subtitle">
            Configure classes, sections, academic rooms, and cohorts
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="btn-primary"
          style={{
            padding: '0.65rem 1.15rem',
            fontSize: '0.9rem',
          }}
        >
          <Plus size={18} />
          <span>Add New Class</span>
        </button>
      </div>

      {/* List / Table Card */}
      <Card
        title="Configured Classes"
        subtitle={error ? 'Failed to retrieve classes' : loading ? 'Loading classes...' : `Total ${classes.length} academic ${classes.length === 1 ? 'class' : 'classes'} registered`}
        extra={
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              aria-label="Search classes"
              placeholder="Search by name, section, room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '2rem', height: '36px', fontSize: '0.85rem' }}
            />
          </div>
        }
      >
        {loading ? (
          <div className="table-responsive">
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Class Name</th>
                  <th>Grade</th>
                  <th>Section</th>
                  <th>Room</th>
                  <th>Academic Year</th>
                  <th>Students</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td>
                      <div style={{ width: '120px', height: '16px', borderRadius: '4px', backgroundColor: 'var(--border-color)' }} />
                    </td>
                    <td>
                      <div style={{ width: '60px', height: '16px', borderRadius: '4px', backgroundColor: 'var(--border-color)' }} />
                    </td>
                    <td>
                      <div style={{ width: '40px', height: '16px', borderRadius: '4px', backgroundColor: 'var(--border-color)' }} />
                    </td>
                    <td>
                      <div style={{ width: '50px', height: '16px', borderRadius: '4px', backgroundColor: 'var(--border-color)' }} />
                    </td>
                    <td>
                      <div style={{ width: '80px', height: '16px', borderRadius: '4px', backgroundColor: 'var(--border-color)' }} />
                    </td>
                    <td>
                      <div style={{ width: '70px', height: '16px', borderRadius: '4px', backgroundColor: 'var(--border-color)' }} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '4px', backgroundColor: 'var(--border-color)' }} />
                        <div style={{ width: '28px', height: '28px', borderRadius: '4px', backgroundColor: 'var(--border-color)' }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : error ? (
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
        ) : filteredClasses.length === 0 ? (
          <EmptyState
            icon={School}
            title="No classes found"
            description={
              searchQuery
                ? 'No classes match your search term. Try a different query.'
                : 'No classes have been added yet. Click "Add New Class" to create one.'
            }
            action={
              !searchQuery && (
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
                >
                  <Plus size={16} />
                  <span>Create First Class</span>
                </button>
              )
            }
          />
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Class Name</th>
                  <th>Grade</th>
                  <th>Section</th>
                  <th>Room</th>
                  <th>Academic Year</th>
                  <th>Students</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.map((cls) => (
                  <tr key={cls.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cls.name}</td>
                    <td>Grade {cls.grade || '-'}</td>
                    <td>{cls.section || '-'}</td>
                    <td>{cls.room || '-'}</td>
                    <td style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      {cls.academicYear || '2026-2027'}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          backgroundColor: 'var(--bg-subtle)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}
                      >
                        {cls.studentCount || 0} enrolled
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cls)}
                          title="Edit Class"
                          className="btn-action btn-action-edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetClass(cls)}
                          title="Delete Class"
                          className="btn-action btn-action-delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClass ? 'Edit Class' : 'Add New Class'}
        maxWidth="500px"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="class-name-input" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Class Name *
            </label>
            <input
              id="class-name-input"
              type="text"
              placeholder="e.g. Grade 10 - Section A"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label htmlFor="class-grade-input" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Grade / Level
              </label>
              <input
                id="class-grade-input"
                type="text"
                placeholder="e.g. 10"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label htmlFor="class-section-input" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Section / Stream
              </label>
              <input
                id="class-section-input"
                type="text"
                placeholder="e.g. A or Science"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label htmlFor="class-room-input" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Room / Lab
              </label>
              <input
                id="class-room-input"
                type="text"
                placeholder="e.g. Room 201"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label htmlFor="class-academic-year-input" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Academic Year
              </label>
              <input
                id="class-academic-year-input"
                type="text"
                placeholder="e.g. 2026-2027"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              {editingClass ? 'Update Class' : 'Create Class'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetClass}
        onClose={() => setDeleteTargetClass(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Class?"
        message={`Are you sure you want to delete "${deleteTargetClass?.name}"? All enrolled students in this class will also be removed.`}
        confirmText="Delete Class"
        isDanger={true}
      />
    </div>
  );
};
