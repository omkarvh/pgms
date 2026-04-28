import pgConfig from '../config/pgConfig'

export async function uploadFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', pgConfig.cloudinary_upload_preset)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${pgConfig.cloudinary_cloud_name}/auto/upload`,
    {
      method: 'POST',
      body: formData
    }
  )

  if (!response.ok) throw new Error('Upload failed')

  const data = await response.json()
  return {
    url: data.secure_url,
    publicId: data.public_id,
    format: data.format,
    resourceType: data.resource_type
  }
}