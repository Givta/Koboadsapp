import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { db, storage, isFirebaseConfigured } from './firebase';

export const isMediaUploadConfigured = isFirebaseConfigured;
export const MAX_MEDIA_BYTES = 30 * 1024 * 1024;
export const MAX_IMAGE_THUMBNAIL_BYTES = 2 * 1024 * 1024;

export interface UploadedMedia {
  url: string;
  mimeType: string;
  sizeBytes: number;
  storagePath?: string;
  thumbnailUrl?: string;
  thumbnailStoragePath?: string;
}

function guessMimeType(uri: string, fallback: string) {
  const ext = uri.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'mp4':
      return 'video/mp4';
    case 'mov':
      return 'video/quicktime';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    default:
      return fallback;
  }
}

function buildStoragePath(userId: string, mimeType: string) {
  const ext = mimeType.split('/').pop() ?? 'bin';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  return `ad-media/${userId}/${filename}`;
}

function buildThumbnailPath(userId: string, baseFileName: string) {
  return `ad-media-thumbnails/${userId}/thumb-${baseFileName}`;
}

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return await response.blob();
}

async function maybeCompressImage(uri: string): Promise<string> {
  try {
    const ImageManipulator: any = await import('expo-image-manipulator');
    const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1200 } }], {
      compress: 0.75,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  } catch {
    return uri;
  }
}

async function createThumbnail(uri: string): Promise<Blob> {
  try {
    const ImageManipulator: any = await import('expo-image-manipulator');
    const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 400 } }], {
      compress: 0.5,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return await uriToBlob(result.uri);
  } catch {
    return await uriToBlob(uri);
  }
}

export async function uploadMediaToFirebase(
  localUri: string,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<UploadedMedia> {
  const mimeType = guessMimeType(localUri, 'image/jpeg');
  const isImage = mimeType.startsWith('image/');
  let uploadUri = localUri;

  if (isImage) {
    uploadUri = await maybeCompressImage(localUri);
  }

  const blob = await uriToBlob(uploadUri);
  if (blob.size > MAX_MEDIA_BYTES) {
    throw new Error(`Media file is too large (${Math.round(blob.size / (1024 * 1024))}MB). Maximum is 30MB.`);
  }

  const storagePath = buildStoragePath(userId, mimeType);
  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, blob, {
    contentType: mimeType,
    customMetadata: {
      approved: 'false',
      userId,
    },
  });

  const uploadPromise = new Promise<UploadedMedia>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          onProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        }
      },
      (error) => reject(error),
      async () => {
        try {
          const url = await getDownloadURL(storageRef);
          let thumbnailUrl: string | undefined;

          let thumbnailStoragePath: string | undefined;
          if (isImage) {
            const baseName = storagePath.split('/').pop() ?? 'thumb.jpg';
            const thumbPath = buildThumbnailPath(userId, baseName);
            const thumbRef = ref(storage, thumbPath);
            const thumbBlob = await createThumbnail(uploadUri);
            await uploadBytesResumable(thumbRef, thumbBlob, { contentType: 'image/jpeg' });
            thumbnailUrl = await getDownloadURL(thumbRef);
            thumbnailStoragePath = thumbPath;
          }

          await setDoc(doc(collection(db, 'mediaModeration')), {
            userId,
            storagePath,
            contentType: mimeType,
            sizeBytes: blob.size,
            status: 'pending',
            createdAt: serverTimestamp(),
          });

          resolve({
            url,
            mimeType,
            sizeBytes: blob.size,
            storagePath,
            thumbnailUrl,
            thumbnailStoragePath,
          });
        } catch (error) {
          reject(error);
        }
      }
    );
  });

  return uploadPromise;
}
