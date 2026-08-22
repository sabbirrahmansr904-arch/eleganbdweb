export const compressImage = (file: File, maxWidth = 1600, maxHeight = 1600, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      compressDataUrl(dataUrl, maxWidth, maxHeight, quality)
        .then(resolve)
        .catch(reject);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const compressDataUrl = (dataUrl: string, maxWidth = 1600, maxHeight = 1600, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      return resolve(dataUrl);
    }

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

      // Safe limit: Max 200,000 characters base64 (~150KB, well under Firestore 1MB limit)
      let currentWidth = Math.round(width);
      let currentHeight = Math.round(height);
      let currentQuality = quality;
      
      let finalDataUrl = '';
      let passes = 0;
      
      while (passes < 12) {
        canvas.width = currentWidth;
        canvas.height = currentHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, currentWidth, currentHeight);
          ctx.drawImage(img, 0, 0, currentWidth, currentHeight);
        }
        
        finalDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
        
        if (finalDataUrl.length < 250000) {
          break;
        }
        
        passes++;
        currentQuality = Math.max(0.3, currentQuality - 0.15);
        currentWidth = Math.round(currentWidth * 0.8);
        currentHeight = Math.round(currentHeight * 0.8);
      }

      resolve(finalDataUrl);
    };
    img.onerror = (error) => reject(error);
  });
};

export const compressAvatar = (file: File): Promise<string> => {
  return compressImage(file, 400, 400, 0.8);
};



