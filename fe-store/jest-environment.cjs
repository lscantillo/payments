const JSDOMEnvironment = require('jest-environment-jsdom').default

class FetchEnvironment extends JSDOMEnvironment {
  constructor(config, context) {
    super(config, context)
    this.global.fetch = fetch
    this.global.Request = Request
    this.global.Response = Response
    this.global.Headers = Headers
    this.global.FormData = FormData
    this.global.TextEncoder = TextEncoder
    this.global.TextDecoder = TextDecoder
    this.global.ReadableStream = ReadableStream
    this.global.WritableStream = WritableStream
    this.global.TransformStream = TransformStream
    this.global.BroadcastChannel = BroadcastChannel
  }
}

module.exports = FetchEnvironment
