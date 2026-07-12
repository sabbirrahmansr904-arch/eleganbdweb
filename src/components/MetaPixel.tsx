import { useEffect } from 'react';
import ReactPixel from 'react-facebook-pixel';

export const MetaPixel = () => {
  useEffect(() => {
    const pixelId = import.meta.env.VITE_META_PIXEL_ID;
    if (pixelId) {
      ReactPixel.init(pixelId);
      ReactPixel.pageView();
    }
  }, []);

  return null;
};
