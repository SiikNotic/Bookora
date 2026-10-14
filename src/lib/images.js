/**
 * Reduce una foto elegida en el teléfono (máx. 1200 px, JPEG) antes de subirla.
 * Devuelve un Blob listo para Supabase Storage.
 */
export function resizeImage(file, max = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Formato de imagen no soportado'));
    };
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen'))), 'image/jpeg', quality);
    };
    img.src = url;
  });
}
