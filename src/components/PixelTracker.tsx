import { useEffect } from 'react';
import { initPixelTracker } from '../utils/pixelTracker';

export default function PixelTracker() {
  useEffect(() => {
    initPixelTracker().catch(err => {
      console.warn('Pixel initialization notice:', err);
    });
  }, []);

  return null;
}
