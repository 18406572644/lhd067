import type { ColorPalette } from '~/types'

export const plantPalettes: ColorPalette[] = [
  {
    id: 'palette_001',
    name: '春日嫩绿',
    description: '清新的春日新芽色彩',
    colors: ['#A8D5BA', '#C5E3C8', '#7BBF96', '#E8F5E9', '#4CAF50'],
    adjustment: { hue: 10, saturation: 20, brightness: 15, contrast: 5 },
    previewColors: ['#A8D5BA', '#C5E3C8', '#7BBF96']
  },
  {
    id: 'palette_002',
    name: '夏日浓荫',
    description: '茂盛的夏季森林绿意',
    colors: ['#2E7D32', '#4CAF50', '#66BB6A', '#1B5E20', '#81C784'],
    adjustment: { hue: 5, saturation: 30, brightness: 5, contrast: 15 },
    previewColors: ['#2E7D32', '#4CAF50', '#66BB6A']
  },
  {
    id: 'palette_003',
    name: '秋日金黄',
    description: '温暖的秋季丰收色调',
    colors: ['#FF8F00', '#FFA726', '#FFB74D', '#FFF3E0', '#EF6C00'],
    adjustment: { hue: 25, saturation: 25, brightness: 10, contrast: 10 },
    previewColors: ['#FF8F00', '#FFA726', '#FFB74D']
  },
  {
    id: 'palette_004',
    name: '冬日素静',
    description: '淡雅的冬季植物色彩',
    colors: ['#B0BEC5', '#78909C', '#546E7A', '#ECEFF1', '#37474F'],
    adjustment: { hue: -10, saturation: -15, brightness: 5, contrast: 0 },
    previewColors: ['#B0BEC5', '#78909C', '#546E7A']
  },
  {
    id: 'palette_005',
    name: '复古棕褐',
    description: '怀旧的干花植物色调',
    colors: ['#8D6E63', '#A1887F', '#BCAAA4', '#EFEBE9', '#6D4C41'],
    adjustment: { hue: -20, saturation: -25, brightness: -5, contrast: 10 },
    previewColors: ['#8D6E63', '#A1887F', '#BCAAA4']
  },
  {
    id: 'palette_006',
    name: '梦幻紫罗',
    description: '神秘的紫色花卉色彩',
    colors: ['#7B1FA2', '#9C27B0', '#BA68C8', '#F3E5F5', '#6A1B9A'],
    adjustment: { hue: -40, saturation: 15, brightness: 0, contrast: 5 },
    previewColors: ['#7B1FA2', '#9C27B0', '#BA68C8']
  },
  {
    id: 'palette_007',
    name: '珊瑚粉艳',
    description: '热情的热带花卉色彩',
    colors: ['#E91E63', '#F06292', '#F48FB1', '#FCE4EC', '#C2185B'],
    adjustment: { hue: -10, saturation: 35, brightness: 10, contrast: 15 },
    previewColors: ['#E91E63', '#F06292', '#F48FB1']
  },
  {
    id: 'palette_008',
    name: '森林深处',
    description: '深邃的原始森林色彩',
    colors: ['#1B5E20', '#2E7D32', '#388E3C', '#E8F5E9', '#0D3D11'],
    adjustment: { hue: 0, saturation: 10, brightness: -15, contrast: 20 },
    previewColors: ['#1B5E20', '#2E7D32', '#388E3C']
  }
]
