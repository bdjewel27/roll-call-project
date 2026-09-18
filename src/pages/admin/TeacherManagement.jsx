import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../context/ToastContext';
import { dataService } from '../../services/dataService';
import { Users, UserPlus, Search, Edit2, Trash2, Mail } from 'lucide-react';

export const TeacherManagement = () => {
  const { showToast } = useToast();
  const [teachers, setTeachers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [deleteTargetTeacher, setDeleteTargetTeacher] = useState(null);

  // Form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    subject: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await dataService.getTeachers();
      setTeachers(list);
    } catch (err) {
      console.error(err);
      showToast('Error loading teachers', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingTeacher(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      subject: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tch) => {
    setEditingTeacher(tch);
    setFormData({
      name: tch.name,
      email: tch.email,
      password: '',
      phone: tch.phone || '',
      subject: tch.subject || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      showToast('Teacher name and email are required', 'error');
      return;
    }

    if (!editingTeacher) {
      if (!formData.password || formData.password.length < 6) {
        showToast('Temporary password must be at least 6 characters', 'error');
        return;
      }
    }

    if (formData.phone && formData.phone.trim().length !== 11) {
      showToast('Phone number must be exactly 11 digits (e.g. 01XXXXXXXXX)', 'error');
      return;
    }

    try {
      if (editingTeacher) {
        await dataService.updateTeacher(editingTeacher.id, formData);
        showToast('Teacher profile updated!', 'success');
      } else {
        await dataService.createTeacher(formData);
        showToast('Teacher registered successfully!', 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error saving teacher', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetTeacher) {
      try {
        await dataService.deleteTeacher(deleteTargetTeacher.id);
        showToast(`Teacher "${deleteTargetTeacher.name}" removed`, 'success');
        setDeleteTargetTeacher(null);
        loadData();
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Error removing teacher', 'error');
      }
    }
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.subject && t.subject.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-primary)' }}>
            Teacher Management
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
            Register, manage, and oversee faculty members and class permissions
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          style={{
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            padding: '0.65rem 1.15rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.9rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <UserPlus size={18} />
          <span>Register New Teacher</span>
        </button>
      </div>

      {/* Table Card */}
      <Card
        title="Faculty Directory"
        subtitle={`Total ${teachers.length} teachers registered`}
        extra={
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name, email, subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '2rem', height: '36px', fontSize: '0.85rem' }}
            />
          </div>
        }
      >
        {filteredTeachers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No teachers found"
            description={
              searchQuery
                ? 'No teachers match your search term. Try a different query.'
                : 'No teachers registered yet. Click "Register New Teacher" to add faculty.'
            }
            action={
              !searchQuery && (
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
                >
                  <UserPlus size={16} />
                  <span>Register First Teacher</span>
                </button>
              )
            }
          />
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Teacher Name</th>
                  <th>Email Address</th>
                  <th>Phone Number</th>
                  <th>Subject / Dept</th>
                  <th>Assigned Classes</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((tch) => {
                  const assignedCount = (tch.assignedClassIds || []).length;
                  return (
                    <tr key={tch.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tch.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {tch.id}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                          <Mail size={13} color="var(--text-muted)" />
                          <span>{tch.email}</span>
                        </div>
                      </td>
                      <td>{tch.phone || '-'}</td>
                      <td>
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            backgroundColor: 'var(--bg-subtle)',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                          }}
                        >
                          {tch.subject || 'General'}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            backgroundColor: assignedCount > 0 ? 'var(--primary-light)' : 'var(--status-absent-bg)',
                            color: assignedCount > 0 ? 'var(--primary-text)' : 'var(--status-absent-text)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                        >
                          {assignedCount} {assignedCount === 1 ? 'class' : 'classes'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(tch)}
                            title="Edit Teacher"
                            style={{
                              padding: '0.35rem 0.6rem',
                              backgroundColor: 'var(--bg-subtle)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-color)',
                            }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTargetTeacher(tch)}
                            title="Delete Teacher"
                            style={{
                              padding: '0.35rem 0.6rem',
                              backgroundColor: 'var(--status-absent-bg)',
                              color: 'var(--status-absent)',
                              border: '1px solid var(--status-absent-border)',
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTeacher ? 'Edit Teacher' : 'Register New Teacher'}
        maxWidth="500px"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Sarah Jenkins"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Email Address *
            </label>
            <input
              type="email"
              placeholder="e.g. teacher@school.edu"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              style={{ width: '100%' }}
            />
          </div>

          {!editingTeacher && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Temporary Password * (minimum 6 characters)
              </label>
              <input
                type="password"
                placeholder="Temporary login password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                The teacher will use this password along with their email to log in at /login.
              </span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Phone Number (11 digits)
              </label>
              <input
                type="tel"
                maxLength={11}
                placeholder="01XXXXXXXXX"
                value={formData.phone}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 11);
                  setFormData({ ...formData, phone: cleaned });
                }}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Subject / Dept
              </label>
              <input
                type="text"
                placeholder="e.g. Mathematics"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              style={{
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
              }}
            >
              {editingTeacher ? 'Update Teacher' : 'Register Teacher'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetTeacher}
        onClose={() => setDeleteTargetTeacher(null)}
        onConfirm={handleDeleteConfirm}
        title="Remove Teacher?"
        message={`Are you sure you want to remove "${deleteTargetTeacher?.name}"? They will be unassigned from all classes.`}
        confirmText="Remove Teacher"
        isDanger={true}
      />
    </div>
  );
};
