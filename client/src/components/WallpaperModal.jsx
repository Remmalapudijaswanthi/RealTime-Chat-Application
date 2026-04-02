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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content wallpaper-modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header">
          <h3>Chat Wallpaper</h3>
          <button onClick={onClose} className="modal-close-btn">✕</button>
        </div>

        {/* Preview box at top */}
        <div className="wallpaper-preview-section">
          <p className="wallpaper-preview-label">PREVIEW</p>
          <div className="wallpaper-preview-box" style={getPreviewStyle(preview)}>
            {/* Fake received bubble */}
            <div className="fake-bubble fake-bubble-received">
              Hey! 👋
            </div>
            {/* Fake sent bubble */}
            <div className="fake-bubble fake-bubble-sent">
              Hello! 😊
            </div>
          </div>
        </div>

        {/* Scrollable options */}
        <div className="wallpaper-options-container">
          <div className="wallpaper-grid">
            {wallpapers.map(wp => (
              <div
                key={wp.id}
                onClick={() => handleSelect(wp)}
                onMouseEnter={() => setPreview(wp)}
                onMouseLeave={() => setPreview(selected)}
                className={`wallpaper-card ${selected?.id === wp.id ? 'selected' : ''}`}
                style={getPreviewStyle(wp)}
              >
                {selected?.id === wp.id && (
                  <div className="wallpaper-check-icon">
                    ✓
                  </div>
                )}
                <div className="wallpaper-card-label">
                  {wp.label}
                </div>
              </div>
            ))}
            
            {/* Custom Upload Card */}
            <div
              className="wallpaper-custom-card"
              onClick={() => customWallpaperRef.current?.click()}
            >
              <div className="wallpaper-custom-icon">+</div>
              <div className="wallpaper-custom-text">Add Your Own</div>
            </div>
            
            {/* Hidden user custom wallpaper fallback if loaded from storage */}
            {selected?.type === 'custom-image' && !wallpapers.map(w => w.id).includes(selected.id) && (
              <div
                key="custom-loaded"
                onClick={() => handleSelect(selected)}
                onMouseEnter={() => setPreview(selected)}
                onMouseLeave={() => setPreview(selected)}
                className="wallpaper-card selected"
                style={getPreviewStyle(selected)}
              >
                <div className="wallpaper-check-icon">
                  ✓
                </div>
                <div className="wallpaper-card-label">
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
        <div className="modal-footer wallpaper-footer">
          <button onClick={handleReset} className="wallpaper-btn wallpaper-btn-reset">
            Reset Default
          </button>
          <button onClick={handleApply} disabled={applying} className="wallpaper-btn wallpaper-btn-apply">
            {applying ? 'Applying...' : 'Apply'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default WallpaperModal;
