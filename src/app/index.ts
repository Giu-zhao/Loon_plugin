import createMessage from './lib/factory'

export type AppResponseResult = {
  changed: boolean
  bodyBytes?: Uint8Array
}

export async function handleAppResponse (
  url: string,
  bodyBytes: Uint8Array
): Promise<AppResponseResult> {
  const responseMessage = createMessage(url)
  if (!responseMessage) return { changed: false }
  responseMessage.fromBinary(bodyBytes)
  await responseMessage.modify()
  return responseMessage.result()
}
