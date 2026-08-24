export const compressImage = (
  file: File, 
  maxWidth = 1600, 
  maxHeight = 1600, 
  quality = 0.85,
  preserveTransparency = false
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const isTransparent = preserveTransparency || 
      file.type === 'image/png' || 
      file.type === 'image/webp' || 
      file.type === 'image/svg+xml' || 
      file.name.toLowerCase().endsWith('.png') ||
      file.name.toLowerCase().endsWith('.webp') ||
      file.name.toLowerCase().endsWith('.svg');

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      compressDataUrl(dataUrl, maxWidth, maxHeight, quality, isTransparent)
        .then(resolve)
        .catch(reject);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const compressDataUrl = (
  dataUrl: string, 
  maxWidth = 1600, 
  maxHeight = 1600, 
  quality = 0.85,
  preserveTransparency = false
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      return resolve(dataUrl);
    }

    const isTransparent = preserveTransparency || 
      dataUrl.startsWith('data:image/png') || 
      dataUrl.startsWith('data:image/webp') ||
      dataUrl.startsWith('data:image/svg');

    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      let currentWidth = Math.max(1, Math.round(width));
      let currentHeight = Math.max(1, Math.round(height));
      let currentQuality = quality;
      
      let finalDataUrl = '';
      let passes = 0;
      
      // Use webp for transparent images to retain alpha transparency with great compression
      const format = isTransparent ? 'image/webp' : 'image/jpeg';
      
      while (passes < 12) {
        canvas.width = currentWidth;
        canvas.height = currentHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, currentWidth, currentHeight);
          if (!isTransparent) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, currentWidth, currentHeight);
          }
          ctx.drawImage(img, 0, 0, currentWidth, currentHeight);
        }
        
        finalDataUrl = canvas.toDataURL(format, currentQuality);
        
        // If webp is not supported or exported blank, fallback appropriately
        if (!finalDataUrl.startsWith(`data:${format}`)) {
          finalDataUrl = isTransparent 
            ? canvas.toDataURL('image/png') 
            : canvas.toDataURL('image/jpeg', currentQuality);
        }
        
        if (finalDataUrl.length < 250000) {
          break;
        }
        
        passes++;
        currentQuality = Math.max(0.3, currentQuality - 0.15);
        currentWidth = Math.max(1, Math.round(currentWidth * 0.8));
        currentHeight = Math.max(1, Math.round(currentHeight * 0.8));
      }

      resolve(finalDataUrl);
    };
    img.onerror = (error) => reject(error);
  });
};

export const compressAvatar = (file: File): Promise<string> => {
  return compressImage(file, 400, 400, 0.8);
};



