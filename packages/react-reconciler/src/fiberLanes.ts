import { FiberRootNode } from "./ReactFiber"

export type Lane = number
export type Lanes = number // 批

export const NoLane = 0b0000
export const NoLanes = NoLane
export const SyncLane = 0b0001

export const mergeLanes = (
  a: Lane | Lanes,
  b: Lane | Lanes
): Lanes => (a | b)

export const getHighestPriorityLane = (lanes: Lanes): Lane => (lanes & -lanes)


export const requestUpdateLane = () => {
  // TODO: 后续后根据不同的触发，返回不同的优先级
  return SyncLane
}

export const markRootFinished = (root: FiberRootNode, lane: Lane) => {
  root.pendingLanes &= ~lane
}