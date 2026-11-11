/**
 * HTML Sanitizer for Blog Content
 * Fixes malformed HTML that causes MDX parsing errors
 */

export interface SanitizeOptions {
  fixSelfClosingTags?: boolean;
  fixNestedBlockElements?: boolean;
  removeEmptyParagraphs?: boolean;
  normalizeWhitespace?: boolean;
}

const DEFAULT_OPTIONS: SanitizeOptions = {
  fixSelfClosingTags: true,
  fixNestedBlockElements: true,
  removeEmptyParagraphs: true,
  normalizeWhitespace: true,
};

/**
 * Sanitizes HTML content for MDX parsing
 * Fixes common issues that cause MDX compilation errors
 */
export function sanitizeHtmlForMDX(
  html: string,
  options: SanitizeOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let sanitized = html;

  // 1. Fix self-closing tags (MDX requires XHTML syntax)
  if (opts.fixSelfClosingTags) {
    sanitized = fixSelfClosingTags(sanitized);
  }

  // 2. Fix nested block elements (e.g., <hr> inside <p>)
  if (opts.fixNestedBlockElements) {
    sanitized = fixNestedBlockElements(sanitized);
  }

  // 3. Remove empty paragraphs
  if (opts.removeEmptyParagraphs) {
    sanitized = removeEmptyParagraphs(sanitized);
  }

  // 4. Normalize whitespace
  if (opts.normalizeWhitespace) {
    sanitized = normalizeWhitespace(sanitized);
  }

  return sanitized;
}

/**
 * Converts HTML5 self-closing tags to XHTML syntax
 * <hr> → <hr />
 * <br> → <br />
 * <img src="..."> → <img src="..." />
 */
function fixSelfClosingTags(html: string): string {
  const selfClosingTags = ['hr', 'br', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];
  
  let fixed = html;
  
  for (const tag of selfClosingTags) {
    // Strategy: Replace all variations with consistent XHTML syntax
    
    // 1. Match self-closing with slash: <hr /> or <hr/>
    const selfClosedRegex = new RegExp(`<${tag}([^>]*?)\\s*\\/\\s*>`, 'gi');
    fixed = fixed.replace(selfClosedRegex, `<${tag}$1 />`);
    
    // 2. Match non-self-closing: <hr> or <hr class="...">
    // Use negative lookahead to avoid already processed tags
    const nonSelfClosedRegex = new RegExp(`<${tag}([^>]*?)(?<!\\/)>(?!\\s*\\/)`, 'gi');
    fixed = fixed.replace(nonSelfClosedRegex, `<${tag}$1 />`);
  }
  
  return fixed;
}

/**
 * Fixes block-level elements nested inside paragraphs
 * This is invalid HTML and causes MDX parsing errors
 * 
 * Example:
 * <p>Text<hr><h2>Title</h2></p> → <p>Text</p><hr /><h2>Title</h2>
 */
function fixNestedBlockElements(html: string): string {
  const blockElements = ['hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'blockquote', 'pre', 'ul', 'ol', 'table'];
  
  let fixed = html;
  
  // Pattern: <p>...text...<hr>...more content...</p>
  // Solution: Close <p> before <hr>, reopen after if needed
  for (const tag of blockElements) {
    // Match <p> containing block element
    const regex = new RegExp(`(<p[^>]*>)([\\s\\S]*?)(<${tag}[^>]*>[\\s\\S]*?</${tag}>|<${tag}[^>]*?/>)([\\s\\S]*?)(</p>)`, 'gi');
    
    fixed = fixed.replace(regex, (_match, pOpen, beforeBlock, blockElement, afterBlock) => {
      const before = beforeBlock.trim();
      const after = afterBlock.trim();
      
      let result = '';
      
      // Add opening paragraph if there's content before block element
      if (before) {
        result += `${pOpen}${before}</p>\n`;
      }
      
      // Add block element
      result += `${blockElement}\n`;
      
      // Add closing paragraph if there's content after block element
      if (after) {
        result += `${pOpen}${after}</p>`;
      }
      
      return result;
    });
  }
  
  return fixed;
}

/**
 * Removes empty paragraphs
 * <p></p> or <p> </p> or <p>&nbsp;</p>
 */
function removeEmptyParagraphs(html: string): string {
  return html.replace(/<p[^>]*>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '');
}

/**
 * Normalizes whitespace
 * - Removes excessive newlines (more than 2)
 * - Trims whitespace around block elements
 */
function normalizeWhitespace(html: string): string {
  let normalized = html;
  
  // Remove excessive newlines (keep max 2)
  normalized = normalized.replace(/\n{3,}/g, '\n\n');
  
  // Trim whitespace around block elements
  const blockElements = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'blockquote', 'pre', 'ul', 'ol', 'li', 'table', 'hr'];
  
  for (const tag of blockElements) {
    // Remove whitespace before opening tag
    normalized = normalized.replace(new RegExp(`\\s+(<${tag}[^>]*>)`, 'gi'), '\n$1');
    
    // Remove whitespace after closing tag
    normalized = normalized.replace(new RegExp(`(</${tag}>)\\s+`, 'gi'), '$1\n');
  }
  
  // Trim start and end
  normalized = normalized.trim();
  
  return normalized;
}

/**
 * Validates if HTML can be safely parsed by MDX
 * Returns array of issues found
 */
export function validateHtmlForMDX(html: string): string[] {
  const issues: string[] = [];
  
  // Check for unclosed self-closing tags
  const selfClosingRegex = /<(hr|br|img|input)([^>]*?)(?<!\/|")>/gi;
  const selfClosingMatches = html.match(selfClosingRegex);
  if (selfClosingMatches) {
    issues.push(`Found ${selfClosingMatches.length} self-closing tags without trailing slash`);
  }
  
  // Check for block elements inside paragraphs
  const nestedBlockRegex = /<p[^>]*>[\s\S]*?<(hr|h[1-6]|div|blockquote|pre|ul|ol|table)[^>]*>[\s\S]*?<\/p>/gi;
  const nestedBlockMatches = html.match(nestedBlockRegex);
  if (nestedBlockMatches) {
    issues.push(`Found ${nestedBlockMatches.length} block elements nested inside paragraphs`);
  }
  
  // Check for unclosed tags (basic check)
  const openTags = html.match(/<([a-z][a-z0-9]*)[^>]*>/gi) || [];
  const closeTags = html.match(/<\/([a-z][a-z0-9]*)>/gi) || [];
  
  if (openTags.length !== closeTags.length) {
    issues.push(`Tag mismatch: ${openTags.length} opening tags, ${closeTags.length} closing tags`);
  }
  
  return issues;
}

/**
 * Sanitizes blog post content before saving to database
 * Use this in admin panel when creating/updating posts
 */
export function sanitizeBlogContent(content: string): string {
  return sanitizeHtmlForMDX(content, {
    fixSelfClosingTags: true,
    fixNestedBlockElements: true,
    removeEmptyParagraphs: true,
    normalizeWhitespace: true,
  });
}
