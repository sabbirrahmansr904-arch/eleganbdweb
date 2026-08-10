export const compressImage = (file: File, maxWidth = 1600, maxHeight = 1600, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
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

        // Safe limit: 500,000 characters of base64 represents about ~375KB (well under Firestore's 1MB limit)
        let currentWidth = Math.round(width);
        let currentHeight = Math.round(height);
        let currentQuality = quality;
        let isPng = file.type === 'image/png';
        let currentFormat = isPng ? 'image/png' : 'image/jpeg';
        
        let dataUrl = '';
        let passes = 0;
        
        while (passes < 12) {
          canvas.width = currentWidth;
          canvas.height = currentHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            if (currentFormat === 'image/jpeg') {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, currentWidth, currentHeight);
            } else {
              ctx.clearRect(0, 0, currentWidth, currentHeight);
            }
            ctx.drawImage(img, 0, 0, currentWidth, currentHeight);
          }
          
          dataUrl = canvas.toDataURL(currentFormat, currentQuality);
          
          if (dataUrl.length < 500000) {
            break;
          }
          
          passes++;
          if (isPng && passes <= 2) {
            currentWidth = Math.round(currentWidth * 0.8);
            currentHeight = Math.round(currentHeight * 0.8);
          } else {
            // Force JPEG for large images since PNG quality parameter is ignored by HTML Canvas
            currentFormat = 'image/jpeg';
            currentQuality = Math.max(0.3, currentQuality - 0.15);
            currentWidth = Math.round(currentWidth * 0.75);
            currentHeight = Math.round(currentHeight * 0.75);
          }
        }

        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};


