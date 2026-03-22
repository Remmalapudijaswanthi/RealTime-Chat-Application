import React from 'react';
import { motion } from 'framer-motion';

export const ChatListSkeleton = () => {
  return (
    <div className="chat-list-skeleton">
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="skeleton" style={{ width: '120px', height: '14px' }} />
              <div className="skeleton" style={{ width: '35px', height: '11px' }} />
            </div>
            <div className="skeleton" style={{ width: '70%', height: '12px' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export const MessagesSkeleton = () => {
  const bubbles = [
    { type: 'received', width: '160px' },
    { type: 'sent', width: '120px' },
    { type: 'received', width: '220px' },
    { type: 'received', width: '180px' },
    { type: 'sent', width: '140px' },
    { type: 'received', width: '200px' },
    { type: 'sent', width: '160px' },
    { type: 'received', width: '210px' },
    { type: 'sent', width: '130px' },
    { type: 'received', width: '190px' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px' }}>
      {bubbles.map((b, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: b.type === 'sent' ? 'flex-end' : 'flex-start',
            alignItems: 'flex-end',
            gap: '8px',
          }}
        >
          {b.type === 'received' && (
            <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
          )}
          <div
            className="skeleton"
            style={{
              width: b.width,
              height: '40px',
              borderRadius: b.type === 'sent' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            }}
          />
        </div>
      ))}
    </div>
  );
};

export const ProfileSkeleton = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="skeleton" style={{ width: '100%', height: '160px', borderRadius: 0 }} />
      <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '50%', marginTop: '-40px', border: '4px solid var(--bg-secondary)' }} />
      <div className="skeleton" style={{ width: '140px', height: '22px', marginTop: '16px' }} />
      <div className="skeleton" style={{ width: '90px', height: '14px', marginTop: '8px' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '24px', alignItems: 'center' }}>
        <div className="skeleton" style={{ width: '240px', height: '14px' }} />
        <div className="skeleton" style={{ width: '180px', height: '14px' }} />
      </div>
    </div>
  );
};

export const SearchSkeleton = () => {
  return (
    <div style={{ padding: '12px' }}>
      {[...Array(3)].map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0' }}>
          <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="skeleton" style={{ width: '120px', height: '14px' }} />
            <div className="skeleton" style={{ width: '80px', height: '11px' }} />
          </div>
        </div>
      ))}
    </div>
  );
};
