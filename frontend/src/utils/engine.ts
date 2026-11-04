/**
 * True for Apple WebKit engines (Safari, and all iOS/iPadOS browsers).
 * Desktop Chrome/Firefox/Edge are false — they can use SVG letter clipPaths safely.
 */
export function isWebKitEngine(): boolean {
  if (typeof navigator === 'undefined') return false;
  const { userAgent, vendor, platform, maxTouchPoints } = navigator;
  if (/iPhone|iPad|iPod/.test(userAgent)) return true;
  // iPadOS 13+ reports as MacIntel but is WebKit.
  if (platform === 'MacIntel' && maxTouchPoints > 1) return true;
  return vendor === 'Apple Computer, Inc.';
}
