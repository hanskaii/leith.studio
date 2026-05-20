import { Container } from 'cloudflare:workers'

export class MediaContainer extends Container {
  defaultPort = 8080
  sleepAfter = '10m'
}
