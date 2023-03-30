// import {
//   unstable_ImmediatePriority as ImmediatePriority,
//   unstable_UserBlockingPriority as UserBlockingPriority,
//   unstable_NormalPriority as NormalPriority,
//   unstable_LowPriority as LowPriority,
//   unstable_IdlePriority as IdlePriority,
//   unstable_getFirstCallbackNode as getFirstCallbackNode,
//   unstable_shouldYield as shouldYield,
//   unstable_cancelCallback as cancelCallback,
//   unstable_scheduleCallback as scheduleCallback,
//   CallbackNode
// } from 'scheduler'
// TODO: 该例子一不小心就会死循环，注意，切记
import {
  ImmediatePriority,
  UserBlockingPriority,
  NormalPriority,
  LowPriority,
  IdlePriority,
  getFirstCallbackNode,
  shouldYield,
  cancelCallback,
  scheduleCallback,
  CallbackNode
} from 'scheduler'
// 这个callbackNode类型有问题，应该是task类型
type Priority = typeof ImmediatePriority
  | typeof UserBlockingPriority
  | typeof NormalPriority
  | typeof LowPriority
  | typeof IdlePriority

interface Work {
  count: number
  priority: Priority
}

const priority2UseList: Priority[] = [
  ImmediatePriority,
  UserBlockingPriority,
  NormalPriority,
  LowPriority
]

const priority2Name = [
  'noop',
  'ImmediatePriority',
  'UserBlockingPriority',
  'NormalPriority',
  'LowPriority'
]

const root = document.querySelector('#root') as Element
const contentBox = document.querySelector('#content') as Element

const workList: Work[] = []
let prevPriority: Priority = IdlePriority
let curCallBack: CallbackNode | null

// 初始化对应的按钮
priority2UseList.forEach(priority => {
  const btn = document.createElement('button')
  root.appendChild(btn)
  btn.innerText = priority2Name[priority]

  btn.onclick = () => {
    workList.push({
      priority,
      count: 50
    })
    schedule()
  }
})

// 调度
function schedule() {
  // 当前可能存在正在调度的回调
  const cbNode = getFirstCallbackNode()
  console.log('-cbNode')
  // 取出最高优先级的work
  const curWork = workList.sort((w1, w2) => {
    return w1.priority - w2.priority
  })[0]

  // 没有work需要执行，退出调度
  if (!curWork) {
    curCallBack = null
    // 会有这种情况吗？，可能是为了兜底吧
    cbNode && cancelCallback(cbNode)
    return
  }

  const { priority: curPriority } = curWork

  if (curPriority === prevPriority) {
    // 有work正在执行， 比较该work与正在执行的wrok的优先级
    // 优先级相同，退出
    return
  }

  // 走到这，curWork 就是最高优先级的work
  // 调度之前，如果有work正在执行，则中断它
  cbNode && cancelCallback(cbNode)

  // 调度当前最高优先级的work
  curCallBack = scheduleCallback(curPriority, perform.bind(null, curWork))
}

// 执行具体的work
function perform(work: Work, didTimeout?: boolean): any {
  // 是否需要同步执行， 这个didtimeout应该是reconcile包的行为，而不是scheduler包的行为
  const needSync = work.priority === ImmediatePriority || didTimeout

  while ((needSync || !shouldYield()) && work.count) {
    work.count--
    // 执行具体的工作
    insertItem(work.priority + '')
  }
  // 执行完成或者中断
  prevPriority = work.priority

  if (!work.count) {
    // 表示已经完成， 从workList中删除完成的work
    const workIndex = workList.indexOf(work)
    workList.splice(workIndex, 1)
    // 重置优先级
    prevPriority = IdlePriority
  }

  const prevCallback = curCallBack
  // 因执行完或者中断
  // 再次发起调度
  schedule()
  const newCallback = curCallBack
  if (newCallback === prevCallback) {
    // 时间切片的耗时用尽，而不是新的work
    return perform.bind(null, work)
  }
}

const insertItem = (content: string) => {
  const ele = document.createElement('span')
  ele.innerText = content
  ele.className = `pri-${content}`
  doSomeBuzyWork()
  contentBox.appendChild(ele)
}

const doSomeBuzyWork = () => {
  const now = performance.now()
  while (performance.now() - now < 30) {
    // do nothing
  }
}