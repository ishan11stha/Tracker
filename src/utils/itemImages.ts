import { Directory, File, Paths } from 'expo-file-system';

/**
 * Copies a camera/library image into the app's document directory so the item
 * photo survives cache cleanup. Returns the original URI if copying fails,
 * preserving the previous best-effort behavior on unusual devices.
 */
export function deletePersistedItemImage(uri: string): void {
  if (!uri || !uri.includes('/item-images/')) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Image cleanup is best effort and must never block item deletion.
  }
}

export async function persistItemImage(sourceUri: string): Promise<string> {
  if (!sourceUri) return '';

  try {
    const imageDirectory = new Directory(Paths.document, 'item-images');
    imageDirectory.create({ intermediates: true, idempotent: true });

    const extension =
      sourceUri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)?.[1]?.toLowerCase() ||
      'jpg';
    const destination = new File(
      imageDirectory,
      `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`
    );

    await new File(sourceUri).copy(destination);
    return destination.uri;
  } catch {
    return sourceUri;
  }
}
