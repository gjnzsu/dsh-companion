if (globalThis.PointerEvent === undefined) {
  class TestPointerEvent extends MouseEvent {
    readonly pointerId: number
    readonly pointerType: string
    readonly isPrimary: boolean

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 0
      this.pointerType = init.pointerType ?? ''
      this.isPrimary = init.isPrimary ?? false
    }
  }

  Object.defineProperty(globalThis, 'PointerEvent', {
    configurable: true,
    value: TestPointerEvent,
    writable: true,
  })
}
