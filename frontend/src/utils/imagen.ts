/** Zona cuadrada a recortar, en píxeles de la imagen original. */
export interface AreaRecorte {
  x: number;
  y: number;
  lado: number;
}

/**
 * Recorta la zona cuadrada que eligió el usuario en el editor de fotos
 * (AjustarFoto) y la redimensiona para móvil (máximo 480x480 px, o su
 * tamaño natural si es menor para evitar sobreescalar). Con `area = null`
 * usa un recorte cuadrado centrado.
 */
export async function recortarCuadrado(
  archivo: File,
  area: AreaRecorte | null,
  tamanoMax: number = 480,
  calidad: number = 0.90
): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const natW = img.naturalWidth || img.width;
        const natH = img.naturalHeight || img.height;

        // Sin área elegida: el cuadrado más grande posible, centrado
        const minLado = area ? area.lado : Math.min(natW, natH);
        const srcX = area ? area.x : (natW - minLado) / 2;
        const srcY = area ? area.y : (natH - minLado) / 2;

        // Tamaño final compacto optimizado para vistas móviles (máximo 480px)
        const dimensionFinal = Math.round(Math.min(minLado, tamanoMax));

        const canvas = document.createElement("canvas");
        canvas.width = dimensionFinal;
        canvas.height = dimensionFinal;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(archivo);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(img, srcX, srcY, minLado, minLado, 0, 0, dimensionFinal, dimensionFinal);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(archivo);
              return;
            }
            const nombreNormalizado = archivo.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const nuevoArchivo = new File([blob], nombreNormalizado, { type: "image/jpeg" });
            resolve(nuevoArchivo);
          },
          "image/jpeg",
          calidad
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(archivo);
    };

    img.src = url;
  });
}

export function leerArchivoComoDataUrl(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result as string);
    lector.onerror = () => reject(lector.error);
    lector.readAsDataURL(archivo);
  });
}
