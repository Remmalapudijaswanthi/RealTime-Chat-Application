const STORAGE_KEY = 'pingme_chat_wallpaper';

export const saveWallpaper = (wallpaperObj) => {
  try {
    const json = JSON.stringify(wallpaperObj);
    localStorage.setItem(STORAGE_KEY, json);
  } catch (e) {
    console.error('Save wallpaper error:', e);
  }
};

export const loadWallpaper = () => {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;
    return JSON.parse(json);
  } catch (e) {
    console.error('Load wallpaper error:', e);
    return null;
  }
};

export const clearWallpaper = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const applyWallpaperToDOM = (wallpaperObj) => {
  const elements = [
    document.querySelector('.messages-area'),
    document.querySelector('.chat-messages'),
    document.querySelector('.messages-container'),
    document.querySelector('[data-messages]'),
    document.getElementById('pingme-chat-area'),
  ].filter(Boolean);

  if (elements.length === 0) {
    console.warn('No chat area element found');
    return false;
  }

  elements.forEach(el => {
    // Reset all background properties first
    el.style.cssText = '';

    if (!wallpaperObj || wallpaperObj.id === 'default' || wallpaperObj.id === 'none') {
      return;
    }

    if (wallpaperObj.type === 'color') {
      el.style.backgroundColor = wallpaperObj.value;

    } else if (wallpaperObj.type === 'gradient') {
      el.style.background = wallpaperObj.value;

    } else if (wallpaperObj.type === 'pattern' || wallpaperObj.type === 'design') {
      el.style.backgroundColor = wallpaperObj.bgColor;
      el.style.backgroundImage = wallpaperObj.pattern;
      el.style.backgroundSize = wallpaperObj.size || 'auto';
      el.style.backgroundRepeat = 'repeat';
    }
  });

  return elements.length > 0;
};
