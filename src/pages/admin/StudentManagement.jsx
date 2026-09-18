import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../context/ToastContext';
import { dataService } from '../../services/dataService';
import {
  GraduationCap,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Upload,
  User,
  X,
} from 'lucide-react';

export const StudentManagement = () => {
  const { showToast } = useToast();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deleteTargetStudent, setDeleteTargetStudent] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    rollNo: '',
    name: '',
    gender: 'Female',
    classId: '',
    guardianName: '',
    guardianPhone: '',
    avatarUrl: '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [clsList, stdList] = await Promise.all([
        dataService.getClasses(),
        dataService.getStudents(selectedClassFilter === 'ALL' ? null : selectedClassFilter),
      ]);
      setClasses(clsList);
      setStudents(stdList);
    } catch (err) {
      console.error(err);
      showToast('Error loading student records', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedClassFilter, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingStudent(null);
    setFormData({
      rollNo: '',
      name: '',
      gender: 'Female',
      classId: classes.length > 0 ? classes[0].id : '',
      guardianName: '',
      guardianPhone: '',
      avatarUrl: '',
    });
    setAvatarFile(null);
    setAvatarPreview(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (std) => {
    setEditingStudent(std);
    setFormData({
      rollNo: std.rollNo,
      name: std.name,
      gender: std.gender || 'Female',
      classId: std.classId || (classes[0]?.id || ''),
      guardianName: std.guardianName || '',
      guardianPhone: std.guardianPhone || '',
      avatarUrl: std.avatarUrl || '',
    });
    setAvatarFile(null);
    setAvatarPreview(std.avatarUrl || null);
    setIsModalOpen(true);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (image/*)', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file size must be under 5MB', 'error');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setFormData((prev) => ({ ...prev, avatarUrl: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.rollNo.trim()) {
      showToast('Roll number and student name are required', 'error');
      return;
    }

    if (!/^\d+$/.test(formData.rollNo.trim())) {
      showToast('Roll number must be purely numeric', 'error');
      return;
    }

    if (formData.guardianPhone && formData.guardianPhone.trim().length !== 11) {
      showToast('Guardian emergency phone must be exactly 11 digits (e.g. 01XXXXXXXXX)', 'error');
      return;
    }

    let finalAvatarUrl = formData.avatarUrl;

    if (avatarFile) {
      setUploadingAvatar(true);
      try {
        const fileExt = avatarFile.name ? avatarFile.name.split('.').pop() : 'png';
        const cleanExt = fileExt.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png';
        const fileName = `student_${formData.rollNo || 'roll'}_${Date.now()}.${cleanExt}`;
        finalAvatarUrl = await dataService.uploadAvatar(avatarFile, fileName);
      } catch (uploadErr) {
        console.warn('[RollCall] Storage upload error:', uploadErr);
        showToast(
          `Photo upload notice: ${uploadErr.message || 'Storage error'}. Saving student without photo.`,
          'warning'
        );
      } finally {
        setUploadingAvatar(false);
      }
    }

    const payload = {
      ...formData,
      avatarUrl: finalAvatarUrl,
    };

    try {
      if (editingStudent) {
        await dataService.updateStudent(editingStudent.id, payload);
        showToast('Student information updated!', 'success');
      } else {
        await dataService.createStudent(payload);
        showToast('Student enrolled successfully!', 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error saving student', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetStudent) {
      try {
        await dataService.deleteStudent(deleteTargetStudent.id);
        showToast(`Student "${deleteTargetStudent.name}" removed`, 'success');
        setDeleteTargetStudent(null);
        loadData();
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Error removing student', 'error');
      }
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.guardianName && s.guardianName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-primary)' }}>
            Student Management
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
            Enroll students, assign roll numbers, and organize class rosters
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
          <span>Enroll New Student</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
              Filter by Class
            </label>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              style={{ width: '100%', height: '38px' }}
            >
              <option value="ALL">All Classes ({classes.length})</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 2, minWidth: '260px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
              Search Students
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by student name, roll number, guardian..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: '2rem', height: '38px', fontSize: '0.875rem' }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Student List */}
      <Card
        title="Enrolled Students"
        subtitle={`Showing ${filteredStudents.length} students`}
      >
        {filteredStudents.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No students found"
            description={
              searchQuery
                ? 'No students match your search criteria. Try a different query.'
                : 'No students enrolled in this class yet. Click "Enroll New Student" to add one.'
            }
            action={
              !searchQuery && (
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
                >
                  <UserPlus size={16} />
                  <span>Enroll First Student</span>
                </button>
              )
            }
          />
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Roll #</th>
                  <th>Student Name</th>
                  <th>Gender</th>
                  <th>Enrolled Class</th>
                  <th>Guardian</th>
                  <th>Contact</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((std) => {
                  const cls = classes.find((c) => c.id === std.classId);
                  return (
                    <tr key={std.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {std.rollNo}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              aspectRatio: '1 / 1',
                              borderRadius: '8px',
                              backgroundColor: 'var(--bg-subtle)',
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              flexShrink: 0,
                            }}
                          >
                            {std.avatarUrl ? (
                              <img
                                src={std.avatarUrl}
                                alt={std.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                                {std.name ? std.name.charAt(0).toUpperCase() : 'S'}
                              </span>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{std.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {std.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>{std.gender || '-'}</td>
                      <td>
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            backgroundColor: 'var(--bg-subtle)',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                          }}
                        >
                          {cls ? cls.name : 'Unassigned'}
                        </span>
                      </td>
                      <td>{std.guardianName || '-'}</td>
                      <td>
                        {std.guardianPhone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <Phone size={13} color="var(--text-muted)" />
                            <span>{std.guardianPhone}</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(std)}
                            title="Edit Student"
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
                            onClick={() => setDeleteTargetStudent(std)}
                            title="Delete Student"
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

      {/* Enroll / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudent ? 'Edit Student Details' : 'Enroll New Student'}
        maxWidth="520px"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Avatar Photo Field (1:1 Aspect Ratio) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Student Photo / Avatar (1:1 Square)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '84px',
                  height: '84px',
                  aspectRatio: '1 / 1',
                  borderRadius: '12px',
                  border: '2px dashed var(--border-color)',
                  backgroundColor: 'var(--bg-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Student Avatar Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <User size={28} />
                    <div style={{ fontSize: '0.65rem', marginTop: '2px', fontWeight: 600 }}>1:1</div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flexGrow: 1 }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Upload size={14} />
                    <span>{avatarPreview ? 'Change Photo' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleAvatarChange}
                    />
                  </label>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.4rem 0.65rem',
                        borderRadius: '6px',
                        backgroundColor: 'var(--status-absent-bg)',
                        color: 'var(--status-absent)',
                        border: '1px solid var(--status-absent-border)',
                        fontSize: '0.825rem',
                        fontWeight: 500,
                      }}
                    >
                      <X size={14} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Accepts JPG, PNG, WEBP (image/*). Square 1:1 preview.
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Roll Number *
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 101"
                value={formData.rollNo}
                onChange={(e) => setFormData({ ...formData, rollNo: e.target.value.replace(/\D/g, '') })}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Full Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Alice Walker"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                style={{ width: '100%' }}
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Assigned Class *
              </label>
              <select
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                required
                style={{ width: '100%' }}
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Guardian / Parent
              </label>
              <input
                type="text"
                placeholder="e.g. Robert Walker"
                value={formData.guardianName}
                onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Emergency Phone (11 digits)
              </label>
              <input
                type="tel"
                maxLength={11}
                placeholder="01XXXXXXXXX"
                value={formData.guardianPhone}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 11);
                  setFormData({ ...formData, guardianPhone: cleaned });
                }}
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
              disabled={uploadingAvatar}
              style={{
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                opacity: uploadingAvatar ? 0.7 : 1,
                cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
              }}
            >
              {uploadingAvatar
                ? 'Uploading Photo...'
                : editingStudent
                ? 'Save Changes'
                : 'Enroll Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetStudent}
        onClose={() => setDeleteTargetStudent(null)}
        onConfirm={handleDeleteConfirm}
        title="Remove Student?"
        message={`Are you sure you want to remove "${deleteTargetStudent?.name}" (Roll: ${deleteTargetStudent?.rollNo})? Past attendance records for this student will be retained.`}
        confirmText="Remove Student"
        isDanger={true}
      />
    </div>
  );
};
