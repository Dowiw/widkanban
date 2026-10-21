/**
 * Safely opens an external URL using @tauri-apps/plugin-opener in native desktop mode,
 * with a fallback to window.open for browser and preview test environments.
 */
export async function safeOpenUrl(url: string): Promise<void> {
  if (!url || !url.trim()) return;

  const trimmed = url.trim();

  // Validate URL scheme to prevent javascript: or unsafe execution
  if (!/^https?:\/\//i.test(trimmed) && !/^mailto:/i.test(trimmed)) {
    console.warn('Blocked unsafe URL scheme:', trimmed);
    return;
  }

  try {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(trimmed);
  } catch {
    try {
      window.open(trimmed, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.warn('Failed to open external URL in fallback:', e);
    }
  }
}
