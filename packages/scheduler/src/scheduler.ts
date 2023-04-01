import MiniHeap from './MiniHeap'
import type { PriorityLevel } from './Prioirties'
import { frameYieldMs as frameInterval } from './featureFlags'
import {
  ImmediatePriority,
  UserBlockingPriority,
  NormalPriority,
  LowPriority,
  IdlePriority
} from './Prioirties'
import { getCurrentTime, requestHostTimeout, cancelHostTimeout } from './utils'

export type Callback = (didUserTimeout: boolean) => Callback | undefined

type ScheduledHostCallback = (hasTimeRemaining: boolean, initialTime: number) => boolean

type Task = {
  id: number
  callback: Callback | null
  // 排序的index，如果是timerQueue的任务，sortIndex为startTime，
  // 如果是taskQueue的任务， sortIndex为expirationTime
  sortIndex: number
  priorityLevel: PriorityLevel
  startTime: number
  expirationTime: number
}

export type CallbackNode = Task

// Math.pow(2, 30) - 1
// 0b111111111111111111111111111111
const maxSigned31BitInt = 1073741823

const IMMEDIATE_PRIORITY_TIMEOUT = -1
const USER_BLOCKING_PRIORITY_TIMEOUT = 250
const NORMAL_PRIORITY_TIMEOUT = 5000
const LOW_PRIORITY_TIMEOUT = 10000
// 永远也不会过时
const IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt

const timerQueue = new MiniHeap<Task>()
const taskQueue = new MiniHeap<Task>()

// 全局变量，用来标识task的id的，每新增一个task，id会递增
// 过期时间相同的话，会根据id去比较
let taskIdCounter = 0

// 标识当前是否正在执行task任务，也就是执行者task中的callback
let isPerformingWork = false

// 是否正在调度着taskQueue
let isHostCallbackScheduled = false

// 是否正在调度着timerQueue
let isHostTimeoutScheduled = false

// 开始的时间，用于标识是否超过规定每帧执行的时长
let startTime = -1
let currentPriorityLevel = NormalPriority
// TODO:
let isMessageLoopRuning = false
let currentTask: Task | null = null
let scheduledHostCallback: ScheduledHostCallback | null = null

export const shouldYield = () => {
  const timeElapsed = getCurrentTime() - startTime
  return timeElapsed > frameInterval
}

const advanceTimers = (currentTime: number) => {
  let timer = timerQueue.peek()
  while (timer !== null) {
    if (timer.callback === null) {
      // 任务已被取消
      timerQueue.pop()
    } else if (timer.startTime < currentTime) {
      // 到时间了,入队到taskQueue中
      timerQueue.pop()
      timer.sortIndex = timer.expirationTime
      taskQueue.push(timer)
    } else {
      // 终止遍历
      return
    }
    timer = timerQueue.peek()
  }
}

const getTimeoutByPriority = (priority: PriorityLevel) => {
  // 获取timeout
  let timeout: number
  switch (priority) {
    case ImmediatePriority:
      timeout = IMMEDIATE_PRIORITY_TIMEOUT
      break
    case UserBlockingPriority:
      timeout = USER_BLOCKING_PRIORITY_TIMEOUT
      break
    case NormalPriority:
      timeout = NORMAL_PRIORITY_TIMEOUT
      break
    case LowPriority:
      timeout = LOW_PRIORITY_TIMEOUT
      break
    case IdlePriority:
      timeout = IDLE_PRIORITY_TIMEOUT
      break
    default:
      if (__DEV__) {
        console.error('传入的priority不合法', priority)
      }
      timeout = ImmediatePriority
      break;
  }
  return timeout
}

const flushWork = (hasTimeRemaining: boolean, initialTime: number) => {
  // 已经开始执行了，把调度callback的标志重置，确保下次时间切片能够调度进来
  isHostCallbackScheduled = false
  if (isHostTimeoutScheduled) {
    // 已经有taskQueue的任务在执行了
    isHostCallbackScheduled = false
    cancelHostTimeout()
  }
  // 保留上一次的priorityLevel 也就是初始的priorityLevel，目前只有在workLoop的时候才会被设置
  const prevPriorityLevel = currentPriorityLevel
  isPerformingWork = true
  try {
    return workLoop(hasTimeRemaining, initialTime)
  } finally {
    currentTask = null
    currentPriorityLevel = prevPriorityLevel
    isPerformingWork = false
  }
}

const performWorkUntilDeadline = () => {
  if (scheduledHostCallback !== null) {
    startTime = getCurrentTime()
    let hasMoreWork = true
    const hasTimeRemaining = true
    try {
      hasMoreWork = scheduledHostCallback(hasTimeRemaining, startTime)
    } finally {
      if (hasMoreWork) {
        // 当前任务还没有执行完，继续调度
        schedulePerformWorkUntilDeadline()
      } else {
        // 当前任务执行完
        isMessageLoopRuning = false
        scheduledHostCallback = null
      }
    }
  } else {
    isMessageLoopRuning = false
  }
}

let schedulePerformWorkUntilDeadline: () => void

if (typeof setImmediate === 'function') {
  schedulePerformWorkUntilDeadline = () => {
    setImmediate(performWorkUntilDeadline)
  }
} else if (typeof MessageChannel !== 'undefined') {
  const channel = new MessageChannel()
  const port = channel.port2
  channel.port1.onmessage = performWorkUntilDeadline
  schedulePerformWorkUntilDeadline = () => {
    port.postMessage(null)
  }
  port.postMessage(null)
} else {
  schedulePerformWorkUntilDeadline = () => {
    setTimeout(performWorkUntilDeadline, 0)
  }
}


const requestHostCallback = (
  cb: ScheduledHostCallback
) => {
  scheduledHostCallback = cb
  if (!isMessageLoopRuning) {
    isMessageLoopRuning = true
    schedulePerformWorkUntilDeadline()
  }
}

const handleTimeout = (currentTime: number) => {
  isHostTimeoutScheduled = false
  advanceTimers(currentTime)

  if (taskQueue.peek() !== null) {
    // taskQueue有任务，开启taskQueue的调度
    isHostCallbackScheduled = true
    requestHostCallback(flushWork)
  } else {
    // taskQueue 没有任务
    const firstTimer = timerQueue.peek()
    if (firstTimer !== null) {
      requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime)
    }
  }
}

/**
 * 调度
 */
export const scheduleCallback = (
  priority: PriorityLevel,
  callback: Callback,
  options: { delay?: number } = {}
) => {
  // 创建task
  const currentTime = getCurrentTime()
  // 获取开始时间
  const delay = options.delay ?? 0
  const startTime = delay > 0 ? (currentTime + delay) : currentTime
  const timeout = getTimeoutByPriority(priority)
  // 过期时间，用来解决饥饿任务问题
  const expirationTime = startTime + timeout

  const newTask: Task = {
    id: ++taskIdCounter,
    startTime,
    expirationTime,
    callback,
    sortIndex: -1,
    priorityLevel: priority
  }

  // 根据开始时间来判断进入哪个队列
  if (startTime > currentTime) {
    newTask.sortIndex = startTime
    timerQueue.push(newTask)
    if (taskQueue.peek() === null && timerQueue.peek() === newTask) {
      // task任务堆中没有任务，并且当前的timeQueue任务堆中 新task是最先到时间的，
      // 开启一个定时器，到期把timerQueue的任务入队到taskQueue中
      if (isHostTimeoutScheduled) {
        cancelHostTimeout()
      } else {
        // schedule timeout
        isHostTimeoutScheduled = true
      }
      // schedule a timeout
      requestHostTimeout(handleTimeout, startTime - currentTime)
    }
  } else {
    newTask.sortIndex = expirationTime
    taskQueue.push(newTask)
    if (!isPerformingWork && !isHostCallbackScheduled) {
      isHostCallbackScheduled = true
      requestHostCallback(flushWork)
    }
  }
  return newTask
}

// 执行task的任务
const workLoop = (
  hasTimeRemaining: boolean,
  initialTime: number
) => {
  let currentTime = initialTime
  advanceTimers(currentTime)
  currentTask = taskQueue.peek()
  while (currentTask !== null) {
    if (currentTask.expirationTime > currentTime && (!hasTimeRemaining || shouldYield())) {
      // 任务还没有过期，且没有时长了，那么暂停该任务
      break
    }
    const callback = currentTask.callback
    if (typeof callback === 'function') {
      // 先设置为null, 因为执行任务的时候有可能会有task入队
      currentTask.callback = null
      currentPriorityLevel = currentTask.priorityLevel
      const didUserCallbackTimeout = currentTask.expirationTime < currentTime
      const continuationCallback = callback(didUserCallbackTimeout)
      currentTime = getCurrentTime()
      if (typeof continuationCallback === 'function') {
        // 该任务还没有执行完
        currentTask.callback = continuationCallback
        advanceTimers(currentTime)
        // 这种情况是应为时间切片已经耗尽，下一帧再执行
        return true
      } else {
        // 该任务已经执行完
        if (currentTask === taskQueue.peek()) {
          // 确保pop的任务是当前的任务
          taskQueue.pop()
        }
        advanceTimers(currentTime)
      }
    } else {
      taskQueue.pop()
    }
    currentTask = taskQueue.peek()
  }

  if (currentTask !== null) {
    // 开启下一个任务
    return true
  } else {
    const firstTimer = timerQueue.peek()
    if (firstTimer !== null) {
      // 开启一个定时器
      requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime)
    }
    return false
  }
}

export const cancelCallback = (task: Task) => {
  task.callback = null
}

export const getFirstCallbackNode = () => {
  return taskQueue.peek()
}

export const runWithPriority = <T>(
  priorityLevel: PriorityLevel,
  callback: () => T
) => {
  switch (priorityLevel) {
    case ImmediatePriority:
    case UserBlockingPriority:
    case NormalPriority:
    case LowPriority:
    case IdlePriority:
      break
    default:
      // 给的level值不合法，默认NormalPriority
      priorityLevel = NormalPriority
  }
  const previousPriorityLevel = currentPriorityLevel
  currentPriorityLevel = priorityLevel
  try {
    return callback()
  } finally {
    currentPriorityLevel = previousPriorityLevel
  }
}

// 获取当前上下文环境的 priorityLevel
export const getCurrentPriorityLevel = () => currentPriorityLevel as PriorityLevel
