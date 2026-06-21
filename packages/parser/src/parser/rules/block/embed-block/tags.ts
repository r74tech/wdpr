const EMBED_BLOCK_NAMES = new Set(["embed", "embedvideo", "embedaudio"]);

export function isEmbedBlockName(name: string): boolean {
  return EMBED_BLOCK_NAMES.has(name);
}
