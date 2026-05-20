import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { resize, clip } from '@workspace/media'
import type { ResizeOptions, ClipOptions } from '@workspace/media'

interface OperationRequest {
  type: 'resize' | 'clip'
  inputKey: string
  outputKey: string
  options: ResizeOptions | ClipOptions
}

interface ProcessRequest {
  bucket: string
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  operations: OperationRequest[]
}

interface OperationResultEntry {
  outputKey: string
  sizeBytes: number
}

const app = new Hono()
  .post('/process', async (c) => {
    const body = await c.req.json<ProcessRequest>()

    const s3 = new S3Client({
      region: 'auto',
      endpoint: body.endpoint,
      credentials: {
        accessKeyId: body.accessKeyId,
        secretAccessKey: body.secretAccessKey
      }
    })

    const results: OperationResultEntry[] = []

    for (const op of body.operations) {
      // Fetch the source object from R2
      const getResult = await s3.send(
        new GetObjectCommand({ Bucket: body.bucket, Key: op.inputKey })
      )

      if (!getResult.Body) {
        throw new Error(`Object not found in R2: ${op.inputKey}`)
      }

      // Convert the SDK stream to a Web API ReadableStream
      const nodeStream = getResult.Body as NodeJS.ReadableStream
      const webStream = new ReadableStream<Uint8Array>({
        start(controller) {
          nodeStream.on('data', (chunk: Buffer) => {
            controller.enqueue(new Uint8Array(chunk))
          })
          nodeStream.on('end', () => controller.close())
          nodeStream.on('error', (err) => controller.error(err))
        }
      })

      // Run the appropriate operation
      let result: { buffer: ArrayBuffer; format: string }
      if (op.type === 'resize') {
        result = await resize(webStream, op.options as ResizeOptions)
      } else {
        result = await clip(webStream, op.options as ClipOptions)
      }

      // Upload processed result to R2
      await s3.send(
        new PutObjectCommand({
          Bucket: body.bucket,
          Key: op.outputKey,
          Body: Buffer.from(result.buffer),
          ContentType: 'video/mp4'
        })
      )

      results.push({
        outputKey: op.outputKey,
        sizeBytes: result.buffer.byteLength
      })
    }

    return c.json({ ok: true, operations: results })
  })

serve({ fetch: app.fetch, port: 8080 }, (info) => {
  console.log(`Media container listening on port ${info.port}`)
})
