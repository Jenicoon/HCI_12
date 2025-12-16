import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { firebaseStorage } from './firebase';

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9_.-]/g, '_');

export const uploadGymPhoto = async (ownerId: string, file: File): Promise<string> => {
  const safeName = sanitizeFileName(file.name);
  const timestamp = Date.now();
  const storagePath = `gymPhotos/${ownerId}/${timestamp}-${safeName}`;
  const storageRef = ref(firebaseStorage, storagePath);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
};

export const deleteGymPhoto = async (photoUrl: string): Promise<void> => {
  if (!photoUrl) {
    return;
  }
  try {
    let targetRef = photoUrl ? ref(firebaseStorage, photoUrl) : null;

    if (photoUrl.startsWith('http')) {
      try {
        const url = new URL(photoUrl);
        const pathMatch = url.pathname.match(/\/o\/(.+)/);
        if (pathMatch && pathMatch[1]) {
          const encodedPath = pathMatch[1].split('?')[0];
          const decodedPath = decodeURIComponent(encodedPath);
          targetRef = ref(firebaseStorage, decodedPath);
        }
      } catch (parseError) {
        console.warn('Failed to parse storage path from URL:', parseError);
      }
    }

    if (!targetRef) {
      console.warn('Skipping deletion; unable to derive storage reference for photo URL:', photoUrl);
      return;
    }

    await deleteObject(targetRef);
  } catch (error) {
    console.warn('Failed to delete gym photo from storage:', error);
  }
};
