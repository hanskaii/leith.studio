import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { createReadStream } from 'node:fs'
import { mkdir, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { resize, clip } from '@workspace/media'
import type { ResizeOptions, ClipOptions } from '@workspace/media'

const MOUNT = '/mnt/r2'

interface OperationRequest {
  type: 'resize' | 'clip'
  inputPath: string
  outputPath: string
  options: ResizeOptions | ClipOptions
}

interface ProcessRequest {
  operations: OperationRequest[]
}

interface OperationResultEntry {
  outputPath: string
  sizeBytes: number
}

const app = new Hono()
  .get('/health', async (c) => {
    try {
      await access(MOUNT)
      return c.json({ ok: true, mount: MOUNT })
    } catch {
      return c.json({ ok: false, mount: MOUNT, error: 'R2 mount not available' }, 503)
    }
  })
  .post('/process', async (c) => {
    const body = await c.req.json<ProcessRequest>()
    const results: OperationResultEntry[] = []

    for (const op of body.operations) {
      const nodeStream = createReadStream(op.inputPath)
      const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>

      let result: { buffer: ArrayBuffer; format: string }
      if (op.type === 'resize') {
        result = await resize(webStream, op.options as ResizeOptions)
      } else {
        result = await clip(webStream, op.options as ClipOptions)
      }

      await mkdir(path.dirname(op.outputPath), { recursive: true })
      await writeFile(op.outputPath, Buffer.from(result.buffer))

      results.push({
        outputPath: op.outputPath,
        sizeBytes: result.buffer.byteLength
      })
    }

    return c.json({ ok: true, operations: results })
  })

serve({ fetch: app.fetch, port: 8080 }, (info) => {
  console.log(`Media container listening on port ${info.port}`)
})
