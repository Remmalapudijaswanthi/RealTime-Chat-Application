import React, { useState, useEffect, useRef } from 'react';
import wallpapers from '../data/wallpapers';
import { loadWallpaper } from '../utils/wallpaperStorage';
import applyWallpaper from '../utils/applyWallpaper';
import toast from 'react-hot-toast';

const WallpaperModal = ({ isOpen, onClose, axiosInstance, user }) => {
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState(null);
  const [applying, setApplying] = useState(false);
  const customWallpaperRef = useRef(null);

  const handleCustomWallpaper = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target.result;
      
      const customWallpaper = {
        id: 'custom',
        label: 'My Wallpaper',
        type: 'custom-image',
        value: imageUrl
      };
      
      setSelected(customWallpaper);
      setPreview(customWallpaper);
      
      toast.success('Custom wallpaper selected! Click Apply.');
    };
    reader.readAsDataURL(file);
    
    e.target.value = '';
  };

  // Load current wallpaper when modal opens
  useEffect(() => {
    if (isOpen) {
      const current = loadWallpaper();
      setSelected(current);
      setPreview(current);
    }
  }, [isOpen]);

  const handleSelect = (wallpaperObj) => {
    setSelected(wallpaperObj);
    setPreview(wallpaperObj);
  };

  const getPreviewStyle = (wallpaperObj) => {
    if (!wallpaperObj || wallpaperObj.id === 'default' || wallpaperObj.id === 'none') {
      return { background: 'var(--bg-primary)' };
    }
    if (wallpaperObj.type === 'color') {
      return { backgroundColor: wallpaperObj.value };
    }
    if (wallpaperObj.type === 'gradient') {
      return { background: wallpaperObj.value };
    }
    if (wallpaperObj.type === 'pattern' || wallpaperObj.type === 'design') {
      return {
        backgroundColor: wallpaperObj.bgColor,
        backgroundImage: wallpaperObj.pattern || wallpaperObj.bgImage,
        backgroundSize: wallpaperObj.size || wallpaperObj.bgSize || 'auto',
        backgroundRepeat: 'repeat'
      };
    }
    if (wallpaperObj.type === 'custom-image') {
      return {
        backgroundImage: `url(${wallpaperObj.value})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: ''
      };
    }
    return {};
  };

  const handleApply = async () => {
    if (!selected) {
      alert('Please select a wallpaper first');
      return;
    }
    setApplying(true);
    try {
      await applyWallpaper(selected, axiosInstance, user?._id);
      toast.success('Wallpaper applied!');
      onClose();
    } catch (e) {
      toast.error('Failed to apply wallpaper');
    } finally {
      setApplying(false);
    }
  };

  const handleReset = async () => {
    const defaultWall = { id: 'default', label: 'Default', type: 'color', value: '' };
    await applyWallpaper(defaultWall, axiosInstance, user?._id);
    setSelected(defaultWall);
    setPreview(defaultWall);
    toast.success('Wallpaper reset');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)' }}>
        
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Chat Wallpaper</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {/* Preview box at top */}
        <div style={{ padding: '16px 20px 0' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>PREVIEW</p>
          <div style={{ height: 110, borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', position: 'relative', ...getPreviewStyle(preview) }}>
            {/* Fake received bubble */}
            <div style={{ position: 'absolute', left: 12, top: 16, background: 'var(--received-bubble)', border: '1px solid var(--border)', borderRadius: '12px 12px 12px 2px', padding: '6px 10px', fontSize: 12, color: 'var(--text-primary)', maxWidth: 120 }}>
              Hey! 👋
            </div>
            {/* Fake sent bubble */}
            <div style={{ position: 'absolute', right: 12, bottom: 16, background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', borderRadius: '12px 12px 2px 12px', padding: '6px 10px', fontSize: 12, color: 'white' }}>
              Hello! 😊
            </div>
          </div>
        </div>

        {/* Scrollable options */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 10 }}>
            {wallpapers.map(wp => (
              <div
                key={wp.id}
                onClick={() => handleSelect(wp)}
                onMouseEnter={() => setPreview(wp)}
                onMouseLeave={() => setPreview(selected)}
                style={{
                  height: 65,
                  borderRadius: 10,
                  cursor: 'pointer',
                  border: selected?.id === wp.id ? '2px solid #C084FC' : '2px solid transparent',
                  outline: selected?.id === wp.id ? '1px solid #C084FC' : 'none',
                  boxShadow: selected?.id === wp.id ? '0 0 8px rgba(192,132,252,0.5)' : 'none',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease',
                  ...getPreviewStyle(wp)
                }}
                className="wallpaper-card-hover"
              >
                {selected?.id === wp.id && (
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#C084FC', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white' }}>
                    ✓
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', fontSize: 8, color: 'white', textAlign: 'center', padding: '2px 0' }}>
                  {wp.label}
                </div>
              </div>
            ))}
            
            {/* Custom Upload Card */}
            <div
              className="wallpaper-custom-card-hover"
              onClick={() => customWallpaperRef.current?.click()}
              style={{
                height: 65,
                borderRadius: 10,
                cursor: 'pointer',
                border: '2px dashed #C084FC',
                background: 'transparent',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                position: 'relative'
              }}
            >
              <div style={{ fontSize: 24, color: '#C084FC', lineHeight: 1 }}>+</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>Add Your Own</div>
            </div>
            
            {/* Hidden user custom wallpaper fallback if loaded from storage */}
            {selected?.type === 'custom-image' && !wallpapers.map(w => w.id).includes(selected.id) && (
              <div
                key="custom-loaded"
                onClick={() => handleSelect(selected)}
                onMouseEnter={() => setPreview(selected)}
                onMouseLeave={() => setPreview(selected)}
                style={{
                  height: 65,
                  borderRadius: 10,
                  cursor: 'pointer',
                  border: '2px solid #C084FC',
                  outline: '1px solid #C084FC',
                  boxShadow: '0 0 8px rgba(192,132,252,0.5)',
                  position: 'relative',
                  overflow: 'hidden',
                  ...getPreviewStyle(selected)
                }}
              >
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#C084FC', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white' }}>
                  ✓
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', fontSize: 8, color: 'white', textAlign: 'center', padding: '2px 0' }}>
                  My Wallpaper
                </div>
              </div>
            )}
            
          </div>
          
          <input
            ref={customWallpaperRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleCustomWallpaper}
          />
        </div>

        {/* Footer buttons */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
          <button onClick={handleReset} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14 }}>
            Reset Default
          </button>
          <button onClick={handleApply} disabled={applying} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #7C3AED, #C084FC)', border: 'none', borderRadius: 10, color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            {applying ? 'Applying...' : 'Apply'}
          </button>
        </div>

      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .wallpaper-card-hover:hover {
          transform: scale(1.05);
          z-index: 10;
        }
        .wallpaper-custom-card-hover:hover {
          background: rgba(192,132,252,0.1) !important;
        }
      `}} />
    </div>
  );
};

export default WallpaperModal;
