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
  const applied = applyWallpaperToDOM(wallpaperObj)
  if (!applied) {
    // DOM element not ready yet
    // Try again after short delay
    setTimeout(() => {
      applyWallpaperToDOM(wallpaperObj)
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
