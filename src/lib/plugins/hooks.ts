/**
 * Sistem Hook Backend (Gaya WordPress Actions/Filters)
 * Digunakan untuk memicu logika tambahan saat terjadi event di core system.
 */

type HookCallback = (data: any) => Promise<void> | void;

class HookSystem {
  private hooks: Map<string, HookCallback[]> = new Map();

  /**
   * Mendaftarkan fungsi untuk dijalankan saat event tertentu dipicu.
   */
  on(event: string, callback: HookCallback) {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }
    this.hooks.get(event)?.push(callback);
  }

  /**
   * Memicu semua fungsi yang terdaftar untuk suatu event.
   */
  async trigger(event: string, data: any) {
    const callbacks = this.hooks.get(event);
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          await cb(data);
        } catch (err) {
          console.error(`[Hooks] Error pada event "${event}":`, err);
        }
      }
    }
  }
}

// Singleton instance
export const hooks = new HookSystem();
