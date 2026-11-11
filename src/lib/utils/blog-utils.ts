export function addHeadingIds(html: string): string {
  return html.replace(
    /<h([1-3])(\s[^>]*)?>(.*?)<\/h\1>/gi,
    (_match, level, attrs, content) => {
      const text = content.replace(/<[^>]+>/g, '').trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\sçşğüöı]/g, '')
        .replace(/\s+/g, '-');
      const existingId = /id\s*=\s*["']([^"']+)["']/i.exec(attrs || '');
      const idAttr = existingId ? existingId[0] : `id="${id}"`;
      const newAttrs = existingId ? attrs : `${attrs || ''} ${idAttr}`;
      return `<h${level}${newAttrs}>${content}</h${level}>`;
    }
  );
}
