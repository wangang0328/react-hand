import { getCurrentPriorityLevel, ImmediatePriority, UserBlockingPriority, NormalPriority, IdlePriority, PriorityLevel } from 'scheduler'
import { FiberRootNode } from "./ReactFiber"

export type Lane = number
export type Lanes = number // 批

export const NoLane = 0b0000
export const NoLanes = NoLane
export const SyncLane = 0b0001
export const InputContinuousLane = 0b0010
export const DefaultLane = 0b0100
export const IdleLane = 0b1000

export const mergeLanes = (
  a: Lane | Lanes,
  b: Lane | Lanes
): Lanes => (a | b)

export const getHighestPriorityLane = (lanes: Lanes): Lane => (lanes & -lanes)


export const requestUpdateLane = () => {
  // 从上下文环境中获取shceduler优先级
  const currentPriorityLevel = getCurrentPriorityLevel()
  const lane = schedulerPriorityToLane(currentPriorityLevel)
  return lane
}

export const markRootFinished = (root: FiberRootNode, lane: Lane) => {
  root.pendingLanes &= ~lane
}

export const isSubsetOfLanes = (subSet: Lane, set: Lanes) => {
  return (subSet & set) === subSet
}

export const lanesToSchedulerPriority = (lanes: Lanes) => {
  const lane = getHighestPriorityLane(lanes)
  // 后续要扩展，可能不单单是等于
  if (lane === SyncLane) {
    return ImmediatePriority
  }

  if (lane === InputContinuousLane) {
    return UserBlockingPriority
  }

  if (lane === DefaultLane) {
    return NormalPriority
  }

  return IdlePriority
}

export const schedulerPriorityToLane = (schedulerPriority: PriorityLevel) => {
  if (schedulerPriority === ImmediatePriority) {
    return SyncLane
  }

  if (schedulerPriority === UserBlockingPriority) {
    return InputContinuousLane
  }
  if (schedulerPriority === NormalPriority) {
    return DefaultLane
  }

  return NoLane
}