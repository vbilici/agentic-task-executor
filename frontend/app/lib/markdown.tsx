/**
 * Markdown utilities for artifact content.
 * Uses react-markdown for rendering.
 */

import type { Components } from "react-markdown";

// Re-export ReactMarkdown for convenience
export { default as ReactMarkdown } from "react-markdown";

/**
 * Default prose classes for markdown content.
 * These classes are applied to the wrapper element.
 */
export const markdownProseClasses = "prose prose-sm dark:prose-invert max-w-none";

/**
 * Custom components configuration for react-markdown.
 * Links open in new tabs with security attributes.
 */
export const markdownComponents: Components = {
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:underline dark:text-blue-400"
    >
      {children}
    </a>
  ),
};
