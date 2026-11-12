const DB_NAME = 'gradecraft_pdf_attachments';
const STORE_NAME = 'pdfs';
const DB_VERSION = 1;

function openPdfDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open PDF storage.'));
  });
}

export const PdfAttachmentStorage = {
  async savePdf(id: string, file: Blob, name?: string): Promise<void> {
    const db = await openPdfDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({
        id,
        name: name || 'document.pdf',
        mimeType: file.type || 'application/pdf',
        blob: file,
        updatedAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to save PDF.'));
    });
  },

  async getPdfBlob(id: string): Promise<Blob | null> {
    try {
      const db = await openPdfDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => {
          const record = req.result;
          resolve(record?.blob || null);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  },

  async getPdfObjectUrl(id: string): Promise<string | null> {
    const blob = await this.getPdfBlob(id);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  },

  async deletePdf(id: string): Promise<void> {
    try {
      const db = await openPdfDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Ignore cleanup errors
    }
  },
};
