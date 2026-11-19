/**
 * In-memory registry of object URLs for videos uploaded in this browser session.
 * Video files are never persisted or sent anywhere in the prototype — after a refresh only the
 * metadata remains, so previews must be re-uploaded.
 */
const urls = new Map<string, string>();

export const videoRegistry = {
  set(id: string, file: File) {
    const existing = urls.get(id);
    if (existing) URL.revokeObjectURL(existing);
    const url = URL.createObjectURL(file);
    urls.set(id, url);
    return url;
  },
  get(id: string) {
    return urls.get(id) ?? null;
  },
  remove(id: string) {
    const existing = urls.get(id);
    if (existing) URL.revokeObjectURL(existing);
    urls.delete(id);
  },
};
