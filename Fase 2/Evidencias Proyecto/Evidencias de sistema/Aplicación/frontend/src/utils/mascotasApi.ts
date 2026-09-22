// src/utils/mascotasApi.ts

export const subirFotoMascota = async (mascotaId: number, archivo: File, token: string) => {
  const formData = new FormData();
  formData.append('foto', archivo);

  const respuesta = await fetch(`http://localhost:8080/mascotas/${mascotaId}/fotos`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!respuesta.ok) {
    throw new Error('Error al subir la imagen');
  }

  return await respuesta.json();
};