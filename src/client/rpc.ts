export interface OksRpcResult<T = unknown> {
  ok: boolean
  value?: T
  error?: { message?: string }
}

export interface OksConnectionRpc {
  call(channel: string, endpoint: string, payload: unknown, signal?: AbortSignal): Promise<OksRpcResult>
}

type RpcCandidate = {
  call?: unknown
  rpc?: { call?: unknown }
}

/** Keep the OKS surface fail-closed when a host exposes a transient/incompatible RPC face. */
export function callOksRpc(rpc: unknown, channel: string, endpoint: string, payload: unknown, signal?: AbortSignal): Promise<OksRpcResult> {
  const candidate = rpc as RpcCandidate | null | undefined
  const nested = candidate && typeof candidate.rpc === 'object' ? candidate.rpc : undefined
  const owner = candidate && typeof candidate.call === 'function' ? candidate : nested && typeof nested.call === 'function' ? nested : undefined
  const call = owner && (owner as { call: (...args: unknown[]) => unknown }).call
  if (!call) return Promise.resolve({ ok: false, error: { message: 'OKS 连接接口暂不可用' } })
  try {
    return Promise.resolve(call.call(owner, channel, endpoint, payload, signal) as Promise<OksRpcResult>)
  } catch (error) {
    return Promise.reject(error)
  }
}
