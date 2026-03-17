export function formatTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Less than 1 minute
  if (diffMins < 1) return 'Just now';

  // Less than 1 hour
  if (diffMins < 60) return `${diffMins}m ago`;

  // Today — show time
  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Yesterday
  if (diffDays === 1) return 'Yesterday';

  // Within a week
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }

  // Older
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function formatMessageTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatLastSeen(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'last seen just now';
  if (diffMins < 60) return `last seen ${diffMins}m ago`;

  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 24) return `last seen ${diffHours}h ago`;

  return `last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
}
