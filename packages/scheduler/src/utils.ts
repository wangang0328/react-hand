let taskTimeoutID: NodeJS.Timeout | null
const generateGetCurrentTimeFn = () => {
  if (typeof performance?.now === 'function') {
    return () => performance.now()
  }
  // 不支持performance.now的情况
  const initialTime = Date.now()
  return () => Date.now() - initialTime
}

export const getCurrentTime = generateGetCurrentTimeFn()

export const requestHostTimeout = (cb: (currentTime: number) => void, delay: number) => {
  taskTimeoutID = setTimeout(() => cb(getCurrentTime()), delay)
}

export const cancelHostTimeout = () => {
  if (taskTimeoutID !== null) {
    clearTimeout(taskTimeoutID)
  }
  taskTimeoutID = null
}
