import { Conversion, Input, Output, ALL_FORMATS } from 'mediabunny'
import { ReadableStreamSource, BufferTarget } from '@mediabunny/server'
import { Mp4OutputFormat } from 'mediabunny'
import type { ClipOptions, OperationResult } from '../types'

/**
 * Trim and resize a video to produce a short hover clip.
 * Trims from startSeconds to startSeconds + durationSeconds, then resizes.
 */
export async function clip(
  stream: ReadableStream,
  options: ClipOptions
): Promise<OperationResult> {
  const start = options.startSeconds ?? 0
  const end = start + options.durationSeconds

  const conversion = await Conversion.init({
    input: new Input({
      source: new ReadableStreamSource(stream),
      formats: ALL_FORMATS
    }),
    output: new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget()
    }),
    trim: { start, end },
    video: {
      width: options.width,
      height: options.height,
      fit: options.fit ?? 'contain'
    }
  })

  await conversion.execute()

  return {
    buffer: conversion.output.target.buffer,
    format: 'mp4'
  }
}
