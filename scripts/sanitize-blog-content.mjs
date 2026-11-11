/**
 * Blog Content Sanitization Script
 * Fixes malformed HTML in existing blog posts
 * 
 * Usage:
 *   node scripts/sanitize-blog-content.js
 * 
 * Environment Variables Required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (admin access)
 */

import { createClient } from '@supabase/supabase-js';

// HTML Sanitization Functions (copied from html-sanitizer.ts)
function fixSelfClosingTags(html) {
  const selfClosingTags = ['hr', 'br', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];
  
  let fixed = html;
  
  for (const tag of selfClosingTags) {
    const regex = new RegExp(`<${tag}([^>]*?)(?<!/)>`, 'gi');
    fixed = fixed.replace(regex, `<${tag}$1 />`);
  }
  
  return fixed;
}

function fixNestedBlockElements(html) {
  const blockElements = ['hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'blockquote', 'pre', 'ul', 'ol', 'table'];
  
  let fixed = html;
  
  for (const tag of blockElements) {
    const regex = new RegExp(`(<p[^>]*>)([\\s\\S]*?)(<${tag}[^>]*>[\\s\\S]*?</${tag}>|<${tag}[^>]*?/>)([\\s\\S]*?)(</p>)`, 'gi');
    
    fixed = fixed.replace(regex, (match, pOpen, beforeBlock, blockElement, afterBlock, pClose) => {
      const before = beforeBlock.trim();
      const after = afterBlock.trim();
      
      let result = '';
      
      if (before) {
        result += `${pOpen}${before}</p>\n`;
      }
      
      result += `${blockElement}\n`;
      
      if (after) {
        result += `${pOpen}${after}</p>`;
      }
      
      return result;
    });
  }
  
  return fixed;
}

function removeEmptyParagraphs(html) {
  return html.replace(/<p[^>]*>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '');
}

function normalizeWhitespace(html) {
  let normalized = html;
  
  normalized = normalized.replace(/\n{3,}/g, '\n\n');
  
  const blockElements = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'blockquote', 'pre', 'ul', 'ol', 'li', 'table', 'hr'];
  
  for (const tag of blockElements) {
    normalized = normalized.replace(new RegExp(`\\s+(<${tag}[^>]*>)`, 'gi'), '\n$1');
    normalized = normalized.replace(new RegExp(`(</${tag}>)\\s+`, 'gi'), '$1\n');
  }
  
  normalized = normalized.trim();
  
  return normalized;
}

function sanitizeHtmlForMDX(html) {
  let sanitized = html;
  
  sanitized = fixSelfClosingTags(sanitized);
  sanitized = fixNestedBlockElements(sanitized);
  sanitized = removeEmptyParagraphs(sanitized);
  sanitized = normalizeWhitespace(sanitized);
  
  return sanitized;
}

// Main Script
async function main() {
  console.log('🔧 Blog Content Sanitization Script\n');
  
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing environment variables');
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('📊 Fetching blog posts...\n');
  
  // Fetch all blog posts
  const { data: posts, error: fetchError } = await supabase
    .from('blog_posts')
    .select('id, title, slug, content')
    .order('created_at', { ascending: false });
  
  if (fetchError) {
    console.error('❌ Error fetching posts:', fetchError.message);
    process.exit(1);
  }
  
  if (!posts || posts.length === 0) {
    console.log('ℹ️  No blog posts found.');
    return;
  }
  
  console.log(`Found ${posts.length} blog posts\n`);
  console.log('─'.repeat(80));
  
  let updatedCount = 0;
  let errorCount = 0;
  
  for (const post of posts) {
    console.log(`\n📝 Processing: ${post.title}`);
    console.log(`   Slug: ${post.slug}`);
    console.log(`   Content length: ${post.content.length} chars`);
    
    try {
      // Sanitize content
      const sanitizedContent = sanitizeHtmlForMDX(post.content);
      
      // Check if content changed
      if (sanitizedContent === post.content) {
        console.log('   ✅ No changes needed');
        continue;
      }
      
      console.log(`   🔄 Content modified (${sanitizedContent.length} chars)`);
      
      // Update database
      const { error: updateError } = await supabase
        .from('blog_posts')
        .update({ 
          content: sanitizedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id);
      
      if (updateError) {
        console.error(`   ❌ Update failed: ${updateError.message}`);
        errorCount++;
      } else {
        console.log('   ✅ Updated successfully');
        updatedCount++;
      }
      
    } catch (error) {
      console.error(`   ❌ Error processing post: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log('\n' + '─'.repeat(80));
  console.log('\n📊 Summary:');
  console.log(`   Total posts: ${posts.length}`);
  console.log(`   Updated: ${updatedCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`   Unchanged: ${posts.length - updatedCount - errorCount}`);
  
  if (updatedCount > 0) {
    console.log('\n✅ Blog content sanitization completed successfully!');
  } else {
    console.log('\nℹ️  No posts required updates.');
  }
}

// Run script
main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
