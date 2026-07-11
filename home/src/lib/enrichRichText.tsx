/** 将 **粗体** 转为 HTML 段落 */
export function renderRichParagraph(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

export function RichParagraph({ text }: { text: string }) {
  return <p dangerouslySetInnerHTML={{ __html: renderRichParagraph(text) }} />
}
