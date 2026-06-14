export const apiUrl =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://decisionlog-api.onrender.com' : 'http://localhost:3333')

export const imageFileMaxBytes = 512 * 1024
export const acceptedImageTypes = ['image/png', 'image/jpeg', 'image/webp']
