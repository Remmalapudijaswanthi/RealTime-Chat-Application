import { saveWallpaper, applyWallpaperToDOM } from './wallpaperStorage'

const applyWallpaper = async (
  wallpaperObj,
  axiosInstance,
  userId
) => {
  if (!wallpaperObj) return

  // 1. Save to localStorage immediately
  saveWallpaper(wallpaperObj)

  // 2. Apply to DOM immediately
  const applyParams = () => {
    const el = document.getElementById('chat-window-messages') || document.querySelector('.chat-window');
    if (!el) return false;
    
    if (wallpaperObj.type === 'custom-image') {
      el.style.backgroundImage = `url(${wallpaperObj.value})`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundColor = '';
    } else {
      applyWallpaperToDOM(wallpaperObj);
    }
    return true;
  };

  const applied = applyParams();
  if (!applied) {
    // DOM element not ready yet
    // Try again after short delay
    setTimeout(() => {
      applyParams();
    }, 100)
  }

  // 3. Broadcast to all components
  window.dispatchEvent(
    new CustomEvent('pingme:wallpaper', {
      detail: wallpaperObj
    })
  )

  // 4. Save to MongoDB (dont await, do in background)
  if (axiosInstance && userId) {
    axiosInstance.patch('/api/users/settings', {
      chatWallpaper: JSON.stringify(wallpaperObj)
    }).catch(err => {
      console.error('Wallpaper MongoDB save failed:', err)
    })
  }
}

export default applyWallpaper
