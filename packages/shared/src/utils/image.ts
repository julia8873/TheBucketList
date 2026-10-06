import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export interface ProcessedImage {
  uri: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export interface ImageProcessingResult {
  original: ProcessedImage;
  thumbnail: ProcessedImage;
}

/**
 * Compresses an image and generates a thumbnail.
 * @param uri The local URI of the image to compress
 * @returns Promise with original compressed image and a thumbnail
 */
export async function processBucketImage(uri: string): Promise<ImageProcessingResult> {
  // 1. Process original image (max 1080px, optimized JPEG)
  const originalProcessed = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1080 } }], // Let height auto-scale
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );

  // 2. Generate thumbnail (max 200px, heavily optimized WEBP or JPEG)
  const thumbProcessed = await ImageManipulator.manipulateAsync(
    originalProcessed.uri,
    [{ resize: { width: 200 } }],
    { compress: 0.5, format: ImageManipulator.SaveFormat.WEBP } // WebP is supported in expo-image-manipulator on most platforms
  );

  // 3. Get file sizes using FileSystem
  const originalFileInfo = await FileSystem.getInfoAsync(originalProcessed.uri, { size: true });
  const thumbFileInfo = await FileSystem.getInfoAsync(thumbProcessed.uri, { size: true });

  return {
    original: {
      uri: originalProcessed.uri,
      width: originalProcessed.width,
      height: originalProcessed.height,
      sizeBytes: originalFileInfo.exists && !originalFileInfo.isDirectory ? originalFileInfo.size || 0 : 0,
    },
    thumbnail: {
      uri: thumbProcessed.uri,
      width: thumbProcessed.width,
      height: thumbProcessed.height,
      sizeBytes: thumbFileInfo.exists && !thumbFileInfo.isDirectory ? thumbFileInfo.size || 0 : 0,
    }
  };
}

/**
 * Converts a local URI to a Blob or ArrayBuffer for uploading to Supabase
 */
export async function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response as Blob);
    };
    xhr.onerror = function (e) {
      reject(new TypeError('Network request failed'));
    };
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}
