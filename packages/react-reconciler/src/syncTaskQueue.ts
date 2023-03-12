// 处理同步任务的调度
type Noop = (...args: any) => void
let syncQueue: Noop[] | null = null
let isFlushingSyncQueue = false

export function scheduleSyncCallback(callback: Noop) {
  if (syncQueue === null) {
    syncQueue = [callback]
  } else {
    syncQueue.push(callback)
  }
}

export function flushSyncCallbacks() {
  if (__DEV__) {
    console.log('冲洗同步任务', isFlushingSyncQueue, syncQueue)
  }
  if (!isFlushingSyncQueue && syncQueue?.length) {
    try {
      isFlushingSyncQueue = true
      syncQueue.forEach(cb => cb())
    } catch (error) {
      if (__DEV__) {
        console.warn(error)
      }
    } finally {
      isFlushingSyncQueue = false
      // syncQueue = null
    }
  }
}