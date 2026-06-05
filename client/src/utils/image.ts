import { acceptedImageTypes, imageFileMaxBytes } from '../config/app'
import type { ImageFrameSettings } from '../types'

export function readImageAsDataUrl(file: File) {
  if (!acceptedImageTypes.includes(file.type)) {
    throw new Error('Use uma imagem PNG, JPG ou WebP.')
  }

  if (file.size > imageFileMaxBytes) {
    throw new Error('A imagem deve ter no máximo 512 KB.')
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    reader.readAsDataURL(file)
  })
}

function drawFramedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  size: number,
  frame: ImageFrameSettings,
) {
  const baseScale = Math.max(size / image.width, size / image.height)
  const scale = baseScale * frame.zoom
  const width = image.width * scale
  const height = image.height * scale
  const offsetX = (frame.x / 100) * size
  const offsetY = (frame.y / 100) * size
  const left = (size - width) / 2 + offsetX
  const top = (size - height) / 2 + offsetY

  context.drawImage(image, left, top, width, height)
}

export function cropImageToCircleDataUrl(source: string, frame: ImageFrameSettings) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const size = 512
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      if (!context) {
        reject(new Error('Não foi possível preparar a imagem.'))
        return
      }

      canvas.width = size
      canvas.height = size
      context.clearRect(0, 0, size, size)
      context.save()
      context.beginPath()
      context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
      context.clip()
      drawFramedImage(context, image, size, frame)
      context.restore()

      resolve(canvas.toDataURL('image/png'))
    }
    image.onerror = () => reject(new Error('Não foi possível enquadrar a imagem.'))
    image.src = source
  })
}
