export interface ResizeOptions {
  width: number
  height: number
  fit?: 'cover' | 'contain' | 'fill'
}

export interface ClipOptions extends ResizeOptions {
  startSeconds?: number
  durationSeconds: number
}

export interface OperationResult {
  buffer: ArrayBuffer
  format: 'mp4'
}
