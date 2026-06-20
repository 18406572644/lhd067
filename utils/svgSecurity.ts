const DANGEROUS_TAGS = new Set([
  'script',
  'foreignObject',
  'iframe',
  'object',
  'embed',
  'animate',
  'animateTransform',
  'animateMotion',
  'set',
  'discard',
])

const DANGEROUS_ATTRS = new Set([
  'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout', 'onmousedown',
  'onmouseup', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset',
  'onselect', 'oninput', 'onkeydown', 'onkeypress', 'onkeyup',
  'oncontextmenu', 'ondrag', 'ondrop', 'onresize', 'onscroll', 'onabort',
  'onunload', 'onstorage', 'onmessage', 'onhashchange', 'onpopstate',
  'ontransitionend', 'onanimationend', 'onpointerdown', 'onpointerup',
  'onpointermove', 'onpointerover', 'onpointerout',
])

const HREF_PATTERNS = [
  /^javascript:/i,
  /^vbscript:/i,
  /^data:text\/html/i,
  /^data:text\/svg/i,
]

function isSafeHref(value: string): boolean {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return false
  if (HREF_PATTERNS.some(p => p.test(trimmed))) return false
  if (trimmed.startsWith('data:') && !trimmed.startsWith('data:image/')) return false
  return true
}

export function sanitizeSvg(svgString: string): string {
  if (typeof svgString !== 'string' || !svgString.trim()) {
    return ''
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(svgString, 'image/svg+xml')

  const parserError = doc.querySelector('parsererror')
  if (parserError) {
    throw new Error('SVG 解析失败，请检查文件格式')
  }

  const root = doc.documentElement
  if (!root || root.nodeName.toLowerCase() !== 'svg') {
    throw new Error('无效的 SVG 文件：根元素不是 <svg>')
  }

  sanitizeNode(root)

  const serializer = new XMLSerializer()
  const sanitized = serializer.serializeToString(doc)
  return sanitized
}

function sanitizeNode(node: Element): void {
  const toRemove: Element[] = []

  for (let i = node.children.length - 1; i >= 0; i--) {
    const child = node.children[i]
    const tagName = child.nodeName.toLowerCase()

    if (DANGEROUS_TAGS.has(tagName)) {
      toRemove.push(child)
      continue
    }

    const attrsToRemove: string[] = []
    for (const attr of Array.from(child.attributes)) {
      const attrName = attr.name.toLowerCase()

      if (DANGEROUS_ATTRS.has(attrName)) {
        attrsToRemove.push(attr.name)
        continue
      }

      if (attrName.startsWith('on') || attrName.startsWith('data-') && attrName.includes('on')) {
        attrsToRemove.push(attr.name)
        continue
      }

      if (attrName === 'href' || attrName === 'xlink:href' || attrName === 'src') {
        if (!isSafeHref(attr.value)) {
          attrsToRemove.push(attr.name)
        }
      }

      if (attrName === 'style' && /expression\(|javascript:/i.test(attr.value)) {
        attrsToRemove.push(attr.name)
      }
    }

    for (const attrName of attrsToRemove) {
      child.removeAttribute(attrName)
    }

    sanitizeNode(child)
  }

  for (const el of toRemove) {
    node.removeChild(el)
  }
}

export function validateSvgSize(svgString: string, maxBytes: number = 5 * 1024 * 1024): boolean {
  const bytes = new Blob([svgString]).size
  return bytes <= maxBytes
}

export function getSvgThumbnail(svgString: string, size: number = 200): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!

      const scale = Math.min(size / img.width, size / img.height)
      const w = img.width * scale
      const h = img.height * scale
      const x = (size - w) / 2
      const y = (size - h) / 2

      ctx.clearRect(0, 0, size, size)
      ctx.drawImage(img, x, y, w, h)

      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(generateFallbackThumbnail(size))
    }

    img.src = url
  })
}

export function getPngThumbnail(file: File | Blob, size: number = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!

      const scale = Math.min(size / img.width, size / img.height)
      const w = img.width * scale
      const h = img.height * scale
      const x = (size - w) / 2
      const y = (size - h) / 2

      ctx.clearRect(0, 0, size, size)
      ctx.drawImage(img, x, y, w, h)

      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('PNG 图片加载失败'))
    }

    img.src = url
  })
}

function generateFallbackThumbnail(size: number = 200): string {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#f5f0e6'
  ctx.fillRect(0, 0, size, size)

  ctx.strokeStyle = '#8b7355'
  ctx.lineWidth = 2
  ctx.strokeRect(size * 0.1, size * 0.1, size * 0.8, size * 0.8)

  ctx.fillStyle = '#8b7355'
  ctx.font = `${size * 0.12}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('SVG', size / 2, size / 2)

  return canvas.toDataURL('image/png')
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file, 'utf-8')
  })
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
