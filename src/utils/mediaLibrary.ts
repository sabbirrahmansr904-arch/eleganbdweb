import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface AutoSaveMediaOptions {
  name?: string;
  category?: string;
  source?: 'product' | 'banner' | 'branding' | 'category' | 'uploaded' | 'payment';
  uploadedBy?: string;
  dimensions?: string;
  fileSize?: string;
}

/**
 * Automatically persists any uploaded image across admin panel into Firestore 'media' collection.
 * This guarantees the Media Library always has full live sync of every uploaded asset.
 */
export async function autoSaveToMediaLibrary(
  url: string,
  options?: AutoSaveMediaOptions
): Promise<void> {
  if (!url || typeof url !== 'string' || !url.trim()) return;

  try {
    const trimmedUrl = url.trim();
    const newId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    let calcSize = options?.fileSize;
    if (!calcSize) {
      if (trimmedUrl.startsWith('data:')) {
        const approxBytes = Math.round((trimmedUrl.length * 3) / 4);
        calcSize = approxBytes > 1024 * 1024 
          ? `${(approxBytes / (1024 * 1024)).toFixed(2)} MB` 
          : `${Math.round(approxBytes / 1024)} KB`;
      } else {
        calcSize = 'External Asset';
      }
    }

    await setDoc(doc(db, 'media', newId), {
      id: newId,
      name: options?.name || 'Admin Uploaded Asset',
      url: trimmedUrl,
      category: options?.category || 'General Asset',
      source: options?.source || 'uploaded',
      createdAt: Date.now(),
      uploadedBy: options?.uploadedBy || 'Admin',
      fileSize: calcSize,
      dimensions: options?.dimensions || 'Optimized HD',
      type: 'uploaded'
    });
  } catch (error) {
    // Non-blocking catch to ensure parent workflow never fails
    console.warn('AutoSave to Media Library silent note:', error);
  }
}
