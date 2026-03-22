const WALLPAPERS = [

  // SOLID COLORS
  {
    id: 'default', label: 'Default',
    type: 'color', value: ''
  },
  {
    id: 'pure-black', label: 'Black',
    type: 'color', value: '#000000'
  },
  {
    id: 'dark', label: 'Dark',
    type: 'color', value: '#0D0D0D'
  },
  {
    id: 'white', label: 'White',
    type: 'color', value: '#FFFFFF'
  },
  {
    id: 'cream', label: 'Cream',
    type: 'color', value: '#FDF8F0'
  },
  {
    id: 'sky', label: 'Sky Blue',
    type: 'color', value: '#EFF6FF'
  },
  {
    id: 'mint', label: 'Mint',
    type: 'color', value: '#F0FDF4'
  },
  {
    id: 'blush', label: 'Blush',
    type: 'color', value: '#FDF2F8'
  },

  // GRADIENTS
  {
    id: 'purple-night', label: 'Purple Night',
    type: 'gradient',
    value: 'linear-gradient(160deg, #1a0533 0%, #0d0d0d 100%)'
  },
  {
    id: 'ocean-night', label: 'Ocean Night',
    type: 'gradient',
    value: 'linear-gradient(160deg, #012030 0%, #060b18 100%)'
  },
  {
    id: 'forest', label: 'Forest',
    type: 'gradient',
    value: 'linear-gradient(160deg, #012010 0%, #0d0d0d 100%)'
  },
  {
    id: 'rose-dark', label: 'Rose Dark',
    type: 'gradient',
    value: 'linear-gradient(160deg, #300612 0%, #0d0d0d 100%)'
  },
  {
    id: 'sunrise', label: 'Sunrise',
    type: 'gradient',
    value: 'linear-gradient(135deg, #FEF3C7 0%, #FCA5A5 100%)'
  },
  {
    id: 'ocean-blue', label: 'Ocean Blue',
    type: 'gradient',
    value: 'linear-gradient(135deg, #DBEAFE 0%, #A7F3D0 100%)'
  },
  {
    id: 'candy', label: 'Cotton Candy',
    type: 'gradient',
    value: 'linear-gradient(135deg, #FCE7F3 0%, #BFDBFE 100%)'
  },
  {
    id: 'peach', label: 'Peach',
    type: 'gradient',
    value: 'linear-gradient(135deg, #FED7AA 0%, #F9A8D4 100%)'
  },
  {
    id: 'aurora', label: 'Aurora',
    type: 'gradient',
    value: 'linear-gradient(135deg, #A7F3D0 0%, #DDD6FE 50%, #FBCFE8 100%)'
  },
  {
    id: 'sunset', label: 'Sunset',
    type: 'gradient',
    value: 'linear-gradient(135deg, #FDE68A 0%, #FCA5A5 50%, #C4B5FD 100%)'
  },

  // DESIGNED PATTERNS
  {
    id: 'dots-dark', label: 'Dots Dark',
    type: 'design',
    bgColor: '#0D0D0D',
    pattern: 'radial-gradient(circle, #2A2A2A 1.5px, transparent 1.5px)',
    size: '20px 20px'
  },
  {
    id: 'dots-light', label: 'Dots Light',
    type: 'design',
    bgColor: '#F8FAFC',
    pattern: 'radial-gradient(circle, #CBD5E1 1.5px, transparent 1.5px)',
    size: '20px 20px'
  },
  {
    id: 'dots-purple', label: 'Dots Purple',
    type: 'design',
    bgColor: '#0D0D1A',
    pattern: 'radial-gradient(circle, #7C3AED 1.5px, transparent 1.5px)',
    size: '22px 22px'
  },
  {
    id: 'grid-dark', label: 'Grid Dark',
    type: 'design',
    bgColor: '#0D0D0D',
    pattern: 'linear-gradient(#1A1A2E 1px, transparent 1px), linear-gradient(90deg, #1A1A2E 1px, transparent 1px)',
    size: '25px 25px'
  },
  {
    id: 'grid-light', label: 'Grid Light',
    type: 'design',
    bgColor: '#FFFFFF',
    pattern: 'linear-gradient(#E2E8F0 1px, transparent 1px), linear-gradient(90deg, #E2E8F0 1px, transparent 1px)',
    size: '25px 25px'
  },
  {
    id: 'lines-dark', label: 'Lines Dark',
    type: 'design',
    bgColor: '#111118',
    pattern: 'repeating-linear-gradient(45deg, #1E1E2E 0px, #1E1E2E 1px, transparent 1px, transparent 8px)',
    size: 'auto'
  },
  {
    id: 'lines-light', label: 'Lines Light',
    type: 'design',
    bgColor: '#F1F5F9',
    pattern: 'repeating-linear-gradient(45deg, #E2E8F0 0px, #E2E8F0 1px, transparent 1px, transparent 8px)',
    size: 'auto'
  },
  {
    id: 'zigzag-dark', label: 'Zigzag Dark',
    type: 'design',
    bgColor: '#0D0D0D',
    pattern: 'repeating-linear-gradient(-45deg, #1A1A2E 0, #1A1A2E 1px, transparent 0, transparent 50%), repeating-linear-gradient(45deg, #1A1A2E 0, #1A1A2E 1px, transparent 0, transparent 50%)',
    size: '12px 12px'
  },
  {
    id: 'diamonds', label: 'Diamonds',
    type: 'design',
    bgColor: '#0A0A12',
    pattern: 'repeating-linear-gradient(45deg, #1E1E3A 0px, #1E1E3A 2px, transparent 0px, transparent 50%), repeating-linear-gradient(-45deg, #1E1E3A 0px, #1E1E3A 2px, transparent 0px, transparent 50%)',
    size: '20px 20px'
  },
  {
    id: 'crosses', label: 'Crosses',
    type: 'design',
    bgColor: '#0D0D0D',
    pattern: 'linear-gradient(#2A2A2A 1px, transparent 1px), linear-gradient(90deg, #2A2A2A 1px, transparent 1px), linear-gradient(#2A2A2A 1px, transparent 1px), linear-gradient(90deg, #2A2A2A 1px, transparent 1px)',
    size: '30px 30px, 30px 30px, 6px 6px, 6px 6px'
  },
  {
    id: 'bubbles', label: 'Bubbles',
    type: 'design',
    bgColor: '#0A0A1A',
    pattern: 'radial-gradient(circle at 25% 25%, #1E1E3A 20%, transparent 20%), radial-gradient(circle at 75% 75%, #1A1A30 20%, transparent 20%)',
    size: '30px 30px'
  },
  {
    id: 'triangles', label: 'Triangles',
    type: 'design',
    bgColor: '#F8FAFC',
    pattern: 'linear-gradient(60deg, #E2E8F0 25%, transparent 25%, transparent 75%, #E2E8F0 75%), linear-gradient(120deg, #E2E8F0 25%, transparent 25%, transparent 75%, #E2E8F0 75%)',
    size: '20px 35px'
  },
  {
    id: 'waves', label: 'Waves',
    type: 'design',
    bgColor: '#EFF6FF',
    pattern: 'repeating-linear-gradient(0deg, transparent, transparent 20px, #BFDBFE 20px, #BFDBFE 21px)',
    size: 'auto'
  }
];

export default WALLPAPERS;
