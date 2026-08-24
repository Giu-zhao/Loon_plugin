import { Message, WireType } from '@bufbuild/protobuf'
import { $ } from '../lib/env'

const CACHE_KEY = 'YTUL.App.AdvertiseInfo.v2'

export abstract class YouTubeMessage {
  name: string
  needProcess = false
  needSave = false
  message: any
  version = '2.0'
  whiteNo: number[] = []
  blackNo: number[] = []
  whiteEml: string[] = []
  blackEml: string[] = []
  msgType: Message<any>
  argument: Record<string, any>
  decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true })

  protected constructor (msgType: Message<any>, name: string) {
    this.name = name
    this.msgType = msgType
    this.argument = this.decodeArgument()
    $.isDebug = Boolean(this.argument.debug)
    $.debug(`[YouTube Ultimate][${this.name}] start`)

    const storedData = $.getJSON(CACHE_KEY) as Record<string, any>
    if (storedData?.version === this.version) {
      for (const key of ['whiteNo', 'blackNo']) {
        if (Array.isArray(storedData[key]) && storedData[key].every(Number.isInteger)) this[key] = storedData[key]
      }
      for (const key of ['whiteEml', 'blackEml']) {
        if (Array.isArray(storedData[key]) && storedData[key].every((item) => typeof item === 'string')) this[key] = storedData[key]
      }
    }
  }

  decodeArgument (): Record<string, any> {
    return $.decodeParams({
      enabled: true,
      web_enhance: true,
      app_enhance: true,
      blockUpload: false,
      blockShorts: false,
      blockImmersive: false,
      debug: false
    })
  }

  fromBinary (binaryBody: Uint8Array): YouTubeMessage {
    this.message = this.msgType.fromBinary(binaryBody)
    return this
  }

  abstract pure (): Promise<YouTubeMessage> | YouTubeMessage

  async modify (): Promise<YouTubeMessage> {
    return await this.pure()
  }

  toBinary (): Uint8Array {
    return this.message.toBinary()
  }

  listUnknownFields (msg: any): ReadonlyArray<{ no: number, wireType: WireType, data: Uint8Array }> {
    return msg instanceof Message ? msg.getType().runtime.bin.listUnknownFields(msg) : []
  }

  save (): void {
    if (!this.needSave) return
    $.setJSON({
      version: this.version,
      whiteNo: this.whiteNo.filter(Number.isInteger),
      blackNo: this.blackNo.filter(Number.isInteger),
      whiteEml: this.whiteEml.filter((item) => typeof item === 'string'),
      blackEml: this.blackEml.filter((item) => typeof item === 'string')
    }, CACHE_KEY)
  }

  result (): { changed: boolean, bodyBytes?: Uint8Array } {
    this.save()
    return this.needProcess ? { changed: true, bodyBytes: this.toBinary() } : { changed: false }
  }

  iterate (obj: any = {}, target: string, call: Function): any {
    const stack: any[] = obj && typeof obj === 'object' ? [obj] : []
    while (stack.length) {
      const item = stack.pop()
      for (const key of Object.keys(item)) {
        if (key === target) call(item, stack)
        else if (item[key] && typeof item[key] === 'object') stack.push(item[key])
      }
    }
  }

  isAdvertise (message: Message<any>): boolean {
    const fields = this.listUnknownFields(message)
    if (fields.length) return fields.some((field) => this.handleFieldNo(field))
    return this.handleFieldEml(message)
  }

  handleFieldNo (field: { no: number, data: Uint8Array }): boolean {
    if (this.whiteNo.includes(field.no)) return false
    if (this.blackNo.includes(field.no)) return true
    const isAd = this.checkBufferIsAd(field)
    ;(isAd ? this.blackNo : this.whiteNo).push(field.no)
    this.needSave = true
    return isAd
  }

  handleFieldEml (field: any): boolean {
    let isAd = false
    this.iterate(field, 'renderInfo', (obj, stack) => {
      const eml = obj.renderInfo?.layoutRender?.eml?.split('|')[0] ?? ''
      if (!eml) return
      if (this.whiteEml.includes(eml)) isAd = false
      else if (this.blackEml.includes(eml)) isAd = true
      else {
        const videoContent = obj?.videoInfo?.videoContext?.videoContent
        isAd = this.checkUnknownFiled(videoContent)
        ;(isAd ? this.blackEml : this.whiteEml).push(eml)
        this.needSave = true
      }
      stack.length = 0
    })
    return isAd
  }

  checkBufferIsAd (field: { data: Uint8Array } | undefined): boolean {
    return Boolean(field && field.data.length >= 1000 && this.decoder.decode(field.data).includes('pagead'))
  }

  checkUnknownFiled (unknown: any): boolean {
    return this.listUnknownFields(unknown).some((field) => this.checkBufferIsAd(field))
  }

  isShorts (field: any): boolean {
    if (field?.richSectionContent?.reelShelfRenderer) return true
    let found = false
    this.iterate(field, 'eml', (obj, stack) => {
      found = /shorts(?!_pivot_item)/.test(obj.eml ?? '')
      stack.length = 0
    })
    return found
  }
}
