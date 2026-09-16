/**
 * Safe Image Resize Task Handler
 */
export async function handleImageResize(payload = {}, context = {}) {
  const { width = 800, height = 600, format = 'png', src } = payload;

  // Simulate image processing computation
  await new Promise((resolve) => setTimeout(resolve, 80));

  const targetWidth = Math.min(Math.max(16, Number(width) || 800), 4096);
  const targetHeight = Math.min(Math.max(16, Number(height) || 600), 4096);

  return {
    processed: true,
    dimensions: { width: targetWidth, height: targetHeight },
    format,
    originalSrc: src || 'in-memory-buffer',
    outputUrl: `https://cdn.pulsemesh.internal/processed/${context.jobId}_${targetWidth}x${targetHeight}.${format}`,
    bytesProcessed: targetWidth * targetHeight * 3,
  };
}
