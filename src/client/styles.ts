import cssText from './companion.css?raw'

const STYLE_ATTR = 'data-dsh-companion-style'
const styles = new WeakMap<Document, { element: HTMLStyleElement; users: number }>()

/** Mount the companion stylesheet once per document and return its release handle. */
export function mountCompanionStyles(document: Document): () => void {
  const existing = styles.get(document)
  if (existing !== undefined) {
    existing.users += 1
    return () => release(document, existing)
  }
  const element = document.createElement('style')
  element.setAttribute(STYLE_ATTR, '')
  element.textContent = cssText
  document.head.append(element)
  const record = { element, users: 1 }
  styles.set(document, record)
  return () => release(document, record)
}

/** Release one stylesheet user and remove the element after the final release. */
function release(document: Document, record: { element: HTMLStyleElement; users: number }): void {
  record.users -= 1
  if (record.users !== 0) return
  record.element.remove()
  styles.delete(document)
}
