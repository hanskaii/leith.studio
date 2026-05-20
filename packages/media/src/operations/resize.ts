import { Conversion, Input, Output, ALL_FORMATS } from 'mediabunny'
import { ReadableStreamSource, BufferTarget } from '@mediabunny/server'
import { Mp4OutputFormat } from 'mediabunny'
import type { ResizeOptions, OperationResult } from '../types'

/**
 * Resize a video to the given dimensions without trimming.
 * Produces a full-duration 480p (or any target resolution) mp4 preview.
 */
export async function resize(
  stream: ReadableStream,
  options: ResizeOptions
): Promise<OperationResult> {
  const conversion = await Conversion.init({
    input: new Input({
      source: new ReadableStreamSource(stream),
      formats: ALL_FORMATS
    }),
    output: new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget()
    }),
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
