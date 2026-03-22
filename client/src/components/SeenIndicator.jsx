import React from 'react'

const SeenIndicator = ({ status }) => {

  const isRead = status === 'read'
  const color = isRead ? '#60A5FA' : '#9CA3AF'

  return (
    <svg
      width="22"
      height="14"
      viewBox="0 0 22 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        flexShrink: 0,
        marginLeft: '3px',
        transition: 'all 0.3s ease'
      }}
    >
      {/* CIRCLE 1 — LEFT */}
      <circle
        cx="6"
        cy="7"
        r="5.5"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        style={{ transition: 'stroke 0.3s ease' }}
      />

      {/* TICK inside Circle 1 */}
      <polyline
        points="3.2,7 5.2,9.2 8.8,4.8"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        style={{ transition: 'stroke 0.3s ease' }}
      />

      {/* CIRCLE 2 — RIGHT (slightly overlapping) */}
      <circle
        cx="16"
        cy="7"
        r="5.5"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        style={{ transition: 'stroke 0.3s ease' }}
      />

      {/* TICK inside Circle 2 */}
      <polyline
        points="13.2,7 15.2,9.2 18.8,4.8"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        style={{ transition: 'stroke 0.3s ease' }}
      />

    </svg>
  )
}

export default SeenIndicator
