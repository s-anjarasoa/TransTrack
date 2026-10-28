interface HeapItem<T> {
  key: number;
  value: T;
}

export class PriorityQueue<T> {
  private heap: HeapItem<T>[] = [];

  get size(): number { return this.heap.length; }
  isEmpty(): boolean { return this.heap.length === 0; }

  push(key: number, value: T): void {
    this.heap.push({ key, value });
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return top.value;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[parent].key <= this.heap[i].key) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  private bubbleDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let smallest = i;
      if (left < n && this.heap[left].key < this.heap[smallest].key) smallest = left;
      if (right < n && this.heap[right].key < this.heap[smallest].key) smallest = right;
      if (smallest === i) break;
      [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
      i = smallest;
    }
  }
}