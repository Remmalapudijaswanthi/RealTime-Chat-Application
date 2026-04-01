const WALLPAPERS = [
  {
    id: 'default',
    label: 'Default',
    type: 'color',
    value: '',
    preview: 'var(--bg-primary)'
  },
  {
    id: 'purple-night',
    label: 'Purple Night',
    type: 'gradient',
    value: 'linear-gradient(160deg, #1a0533, #0d0d0d)'
  },
  {
    id: 'ocean-night',
    label: 'Ocean Night',
    type: 'gradient',
    value: 'linear-gradient(160deg, #012030, #060b18)'
  },
  {
    id: 'dots-dark',
    label: 'Dots',
    type: 'pattern',
    bgColor: '#0D0D0D',
    bgImage: 'radial-gradient(circle, #2A2A2A 1.5px, transparent 1.5px)',
    bgSize: '20px 20px'
  },
  {
    id: 'grid-dark',
    label: 'Grid',
    type: 'pattern',
    bgColor: '#0D0D0D',
    bgImage: 'linear-gradient(#1A1A2E 1px, transparent 1px), linear-gradient(90deg, #1A1A2E 1px, transparent 1px)',
    bgSize: '25px 25px'
  }
]

export default WALLPAPERS;
