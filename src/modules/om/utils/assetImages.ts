// Helper to resolve compressor images from /src/images and /src/assets
import defaultCompressorSvg from '../assets/compressor-default.svg';
import cmp01Jpeg from '../images/CMP01.jpeg';
import cmp02Jpeg from '../images/CMP02.jpeg';
import cnc01Jpeg from '../../../assets/CNC01.jpeg';

// Dynamically discover any images added into /src/images or /src/assets
const imageModules = import.meta.glob<{ default: string }>('/src/images/*.{png,jpg,jpeg,svg,webp}', {
  eager: true,
});

const assetModules = import.meta.glob<{ default: string }>('/src/assets/*.{png,jpg,jpeg,svg,webp}', {
  eager: true,
});

export function getAssetDisplayName(assetId: string): string {
  if (!assetId) return '';
  const normalized = assetId.toUpperCase().trim();
  if (normalized === 'CMP#02' || normalized === 'CMP02' || normalized === 'TEXMACO-CMP02-SATELLITE') {
    return 'Compressor 2';
  }
  if (normalized === 'CMP#01' || normalized === 'CMP01' || normalized === 'TEXMACO-CMP01-AUX') {
    return 'Compressor 1';
  }
  if (normalized === 'CNC#01' || normalized === 'CNC01' || normalized.includes('TXMCNCI')) {
    return 'CNC 1';
  }
  if (normalized === 'ROBO#01' || normalized === 'ROBO01' || normalized.includes('ROBO') || normalized.includes('TXMMIGI')) {
    return 'Robo Welder';
  }
  const match = normalized.match(/CMP#?0?(\d+)/i);
  if (match) {
    return `Compressor ${match[1]}`;
  }
  return assetId;
}

export function getCompressorImage(compressorId: string, customUploadedUrl?: string | null): string {
  if (customUploadedUrl) {
    return customUploadedUrl;
  }

  const normalizedId = compressorId.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (normalizedId.includes('cnc01') || normalizedId.includes('cnc1') || normalizedId.includes('txmcnci')) {
    return cnc01Jpeg;
  }

  if (normalizedId.includes('robo') || normalizedId.includes('txmmigi')) {
    return cnc01Jpeg;
  }

  if (normalizedId.includes('cmp02') || normalizedId.includes('cmp2')) {
    return cmp02Jpeg;
  }

  if (normalizedId.includes('cmp01') || normalizedId.includes('cmp1')) {
    return cmp01Jpeg;
  }

  // Look through discovered image files in /src/images
  for (const path in imageModules) {
    const fileName = path.split('/').pop()?.toLowerCase() || '';
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')).replace(/[^a-z0-9]/g, '');

    if (nameWithoutExt === normalizedId || normalizedId.includes(nameWithoutExt) || nameWithoutExt.includes(normalizedId)) {
      return imageModules[path]?.default || (imageModules[path] as unknown as string);
    }
  }

  // Look through discovered asset files in /src/assets
  for (const path in assetModules) {
    const fileName = path.split('/').pop()?.toLowerCase() || '';
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')).replace(/[^a-z0-9]/g, '');

    if (nameWithoutExt === normalizedId || normalizedId.includes(nameWithoutExt)) {
      return assetModules[path]?.default || (assetModules[path] as unknown as string);
    }
  }

  // Look for any general compressor image in images or assets
  for (const path in imageModules) {
    return imageModules[path]?.default || (imageModules[path] as unknown as string);
  }

  for (const path in assetModules) {
    const fileName = path.split('/').pop()?.toLowerCase() || '';
    if (fileName.includes('compressor') && !fileName.includes('default')) {
      return assetModules[path]?.default || (assetModules[path] as unknown as string);
    }
  }

  return defaultCompressorSvg;
}

