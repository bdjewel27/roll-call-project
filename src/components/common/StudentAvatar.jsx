import React, { useState, useEffect } from 'react';

// In-memory cache for avatar fetch statuses
const loadedImageCache = new Set();
const failedImageCache = new Set();

const areStudentAvatarPropsEqual = (prevProps, nextProps) => {
  const prevStudent = prevProps.student || {};
  const nextStudent = nextProps.student || {};
  const prevSrc = prevStudent.avatar_url || prevStudent.avatarUrl;
  const nextSrc = nextStudent.avatar_url || nextStudent.avatarUrl;

  return (
    prevStudent.id === nextStudent.id &&
    prevSrc === nextSrc &&
    prevStudent.name === nextStudent.name &&
    prevProps.shape === nextProps.shape &&
    prevProps.size === nextProps.size
  );
};

export const StudentAvatar = React.memo(({
  student,
  shape = 'circle',
  size = 36,
  style = {},
}) => {
  const avatarSrc = student?.avatar_url || student?.avatarUrl;
  const [hasError, setHasError] = useState(() => failedImageCache.has(avatarSrc));

  useEffect(() => {
    setHasError(failedImageCache.has(avatarSrc));
  }, [avatarSrc]);

  const borderRadius = shape === 'circle' ? '9999px' : '8px';

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        aspectRatio: '1 / 1',
        borderRadius,
        backgroundColor: 'var(--bg-subtle)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
        ...style,
      }}
    >
      {avatarSrc && typeof avatarSrc === 'string' && avatarSrc.trim() !== '' && !hasError ? (
        <img
          src={avatarSrc}
          alt={student?.name || 'Student'}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onLoad={() => loadedImageCache.add(avatarSrc)}
          onError={() => {
            failedImageCache.add(avatarSrc);
            setHasError(true);
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius,
          }}
        />
      ) : (
        <span
          style={{
            fontSize: size <= 36 ? '0.85rem' : '1rem',
            fontWeight: 700,
            color: 'var(--primary)',
            lineHeight: 1,
            textTransform: 'uppercase',
          }}
        >
          {student?.name ? student.name.charAt(0).toUpperCase() : 'S'}
        </span>
      )}
    </div>
  );
}, areStudentAvatarPropsEqual);

export default StudentAvatar;
