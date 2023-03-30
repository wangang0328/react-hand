// 小顶堆
type Node = {
  id: number
  sortIndex: number
  [key: string]: any
}

type Heap<T extends Node = Node> = Array<T>

export class MiniHeap<T extends Node = Node> {
  private heap: Heap<T>

  constructor(heap: Heap<T> = []) {
    this.heap = heap
  }

  // 获取第一个
  peek() {
    return this.heap.length ? this.heap[0] : null
  }

  pop() {
    if (!this.heap.length) {
      return null
    }
    const firstNode = this.heap[0]
    const lastNode = this.heap.pop()
    if (firstNode !== lastNode) {
      // 大于一个节点，需要向下筛选
      // 将最后一个赋值给0坐标，然后向下筛选
      this.heap[0] = lastNode as T
      this.siftDown(0)
    }
    return firstNode
  }

  push(node: T) {
    const index = this.heap.length
    this.heap.push(node)
    this.siftUp(index)
  }

  siftUp(i: number) {
    let index = i
    const node = this.heap[index] as T
    // 向上对比筛选
    while (index > 0) {
      const parentNodeIndex = (index - 1) >>> 1
      const parentNode = this.heap[parentNodeIndex]
      if (this.compare(node, parentNode) < 0) {
        this.swap(index, parentNodeIndex)
        index = parentNodeIndex
      } else {
        // 父节点都是更小的了
        return
      }
    }
  }

  // 向下筛选
  siftDown(i: number) {
    let index = i
    const node = this.heap[i]
    const length = this.heap.length
    // 右移一位，符号位不动
    const halfLength = this.heap.length >>> 1
    while (index < halfLength) {
      const leftChildIndex = (index + 1) * 2 - 1
      const leftChildNode = this.heap[leftChildIndex]
      const rightChildIndex = leftChildIndex + 1
      const rightChildNode = this.heap[rightChildIndex]

      if (this.compare(leftChildNode, node) < 0) {
        // 左侧子节点的排序更低
        if (rightChildIndex < length && this.compare(leftChildNode, rightChildNode) > 0) {
          // 右侧节点比左侧节点排序更低
          // 右侧节点和父节点进行交换
          this.swap(rightChildIndex, index)
          index = rightChildIndex
        } else {
          // 左侧节点和父节点进行交换
          this.swap(leftChildIndex, index)
          index = leftChildIndex
        }
      } else if (rightChildIndex < length && this.compare(rightChildNode, node) < 0) {
        // 右侧节点和父节点进行交换
        this.swap(rightChildIndex, index)
        index = rightChildIndex
      } else {
        // 没有子节点比父节点更小的节点了，退出循环
        return
      }
    }
  }

  compare(left: T, right: T) {
    // 先比较sortIndex，再比较id
    const diff = left.sortIndex - right.sortIndex
    return diff === 0 ? (left.id - right.id) : diff
  }

  swap(index1: number, index2: number) {
    const tempNode = this.heap[index1]
    this.heap[index1] = this.heap[index2]
    this.heap[index2] = tempNode
  }
}

export default MiniHeap
