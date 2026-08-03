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

        // Iterative reduction loop to guarantee it fits under Firestore's 1MB limit
        let currentWidth = Math.round(width);
        let currentHeight = Math.round(height);
        let currentQuality = quality;
        let isPng = file.type === 'image/png';
        let currentFormat = isPng ? 'image/png' : 'image/jpeg';
        
        let dataUrl = '';
        let passes = 0;
        
        while (passes < 10) {
          canvas.width = currentWidth;
          canvas.height = currentHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // For JPEG, fill white background to prevent black boxes on transparent PNGs
            if (currentFormat === 'image/jpeg') {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, currentWidth, currentHeight);
            } else {
              ctx.clearRect(0, 0, currentWidth, currentHeight);
            }
            ctx.drawImage(img, 0, 0, currentWidth, currentHeight);
          }
          
          dataUrl = canvas.toDataURL(currentFormat, currentQuality);
          
          // Safe limit: 850,000 characters of base64 represents about 630KB
          if (dataUrl.length < 850000) {
            break;
          }
          
          passes++;
          if (isPng && passes <= 3) {
            // Scale down PNG dimensions first before switching to JPEG
            currentWidth = Math.round(currentWidth * 0.85);
            currentHeight = Math.round(currentHeight * 0.85);
          } else if (isPng && passes === 4) {
            // Switch to JPEG after trying PNG scale-down
            currentFormat = 'image/jpeg';
            currentQuality = 0.9;
          } else {
            // JPEG: scale down dimensions and quality
            currentQuality = Math.max(0.2, currentQuality - 0.15);
            currentWidth = Math.round(currentWidth * 0.8);
            currentHeight = Math.round(currentHeight * 0.8);
          }
        }

        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};


