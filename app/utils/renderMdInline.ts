import MarkdownIt from 'markdown-it'

export function renderMdInline(text: string | undefined) {
  if (!text) {
    return ''
  }
  const md = new MarkdownIt()
  return md.renderInline(text)
}
