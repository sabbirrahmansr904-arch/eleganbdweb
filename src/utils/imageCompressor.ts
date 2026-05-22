export const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.7): Promise<string> => {
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

        // Iterative reduction loop to guarantee it fits under Firestore's 1MB limit
        let currentWidth = width;
        let currentHeight = height;
        let currentQuality = quality;
        let currentFormat = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        
        let dataUrl = '';
        let passes = 0;
        
        while (passes < 8) {
          canvas.width = currentWidth;
          canvas.height = currentHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, currentWidth, currentHeight);
            ctx.drawImage(img, 0, 0, currentWidth, currentHeight);
          }
          
          dataUrl = canvas.toDataURL(currentFormat, currentQuality);
          
          // Safe limit: 850,000 characters of base64 represents about 630KB, which leaves plenty of space
          // under the 1,048,576 byte Firestore document limit.
          if (dataUrl.length < 850000) {
            break;
          }
          
          passes++;
          if (currentFormat === 'image/png') {
            // PNGs don't support lossy quality reduction in canvas.toDataURL, so switch to JPEG
            currentFormat = 'image/jpeg';
          } else {
            // JPEG: scale down both dimensions and quality
            currentQuality = Math.max(0.15, currentQuality - 0.15);
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

