/**
 * Markdown utilities for artifact content.
 * Uses react-markdown for rendering.
 */

// Re-export ReactMarkdown for convenience
export { default as ReactMarkdown } from "react-markdown";

/**
 * Default prose classes for markdown content.
 * These classes are applied to the wrapper element.
 */
export const markdownProseClasses = "prose prose-sm dark:prose-invert max-w-none";

/**
 * Custom components configuration for react-markdown.
 * Can be extended as needed.
 */
export const markdownComponents = {
  // Add custom component overrides here if needed in the future
  // For example: code: CustomCodeBlock
};
