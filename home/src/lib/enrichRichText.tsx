/** 将 **粗体**、[链接](url) 转为 HTML 段落 */
export function renderRichParagraph(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="enrich-inline-link">$1</a>',
    )
}

export function RichParagraph({ text }: { text: string }) {
  return <p dangerouslySetInnerHTML={{ __html: renderRichParagraph(text) }} />
}
