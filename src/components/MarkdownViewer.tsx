import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { ExternalLink, CheckSquare, Square } from 'lucide-react';
import { safeOpenUrl } from '../utils/openUrl';

interface MarkdownViewerProps {
  content: string;
  className?: string;
  maxHeightClass?: string;
}

// Sanitize schema allowing GFM input checkboxes, tables, etc.
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    input: [
      ...(defaultSchema.attributes?.input || []),
      ['type', 'checkbox'],
      ['disabled', 'true', 'disabled', ''],
      ['checked', 'true', 'checked', ''],
    ],
  },
};

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  content,
  className = '',
  maxHeightClass = 'max-h-48',
}) => {
  if (!content || !content.trim()) {
    return null;
  }

  return (
    <div
      className={`markdown-viewer text-[11px] leading-relaxed text-slate-700 dark:text-slate-200 select-text overflow-y-auto ${maxHeightClass} ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={{
          a: ({ href, children, ...props }) => {
            const handleLinkClick = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              if (href) {
                safeOpenUrl(href);
              }
            };

            return (
              <a
                href={href}
                onClick={handleLinkClick}
                className="inline-flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline underline-offset-2 break-all cursor-pointer font-medium"
                title={href}
                target="_blank"
                rel="noreferrer noopener"
                {...props}
              >
                <span>{children}</span>
                <ExternalLink className="h-2.5 w-2.5 shrink-0 inline-block opacity-70" />
              </a>
            );
          },
          h1: ({ children }) => (
            <h1 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-2.5 mb-1 pb-0.5 border-b border-slate-200 dark:border-slate-800">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[11.5px] font-bold text-slate-900 dark:text-slate-100 mt-2 mb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 mt-1.5 mb-0.5">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-[10.5px] font-semibold text-slate-800 dark:text-slate-200 mt-1 mb-0.5">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 mt-1 mb-0.5">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-[10px] font-medium text-slate-600 dark:text-slate-400 mt-0.5 mb-0.5">
              {children}
            </h6>
          ),
          p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc list-outside pl-4 space-y-0.5 my-1.5">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside pl-4 space-y-0.5 my-1.5">
              {children}
            </ol>
          ),
          li: ({ children, className: liClass }) => {
            // Task lists items in remark-gfm have task-list-item class
            const isTaskItem = liClass?.includes('task-list-item');
            return (
              <li className={`leading-relaxed ${isTaskItem ? 'list-none -ml-4 flex items-start space-x-1.5 my-0.5' : ''}`}>
                {children}
              </li>
            );
          },
          input: ({ type, checked, ...props }) => {
            if (type === 'checkbox') {
              return (
                <span className="inline-flex items-center shrink-0 mt-0.5 pointer-events-none">
                  {checked ? (
                    <CheckSquare className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Square className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                  )}
                </span>
              );
            }
            return <input type={type} checked={checked} {...props} />;
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-indigo-400 dark:border-indigo-500 pl-2.5 my-1.5 italic text-slate-600 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-900/60 py-1 rounded-r">
              {children}
            </blockquote>
          ),
          code: ({ className: codeClass, children, ...props }) => {
            const isMultiline = codeClass?.includes('language-') || String(children).includes('\n');
            if (isMultiline) {
              return (
                <div className="my-1.5 rounded-lg bg-slate-900 text-slate-100 border border-slate-800 p-2 overflow-x-auto font-mono text-[10px] leading-snug">
                  <code className="font-mono whitespace-pre" {...props}>
                    {children}
                  </code>
                </div>
              );
            }
            return (
              <code
                className="font-mono text-[10px] px-1 py-0.5 rounded bg-slate-150 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 break-all font-semibold"
                {...props}
              >
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 rounded border border-slate-200 dark:border-slate-750">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-750 text-[10px]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100 dark:bg-slate-850 font-semibold text-slate-800 dark:text-slate-200">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {children}
            </tbody>
          ),
          th: ({ children }) => (
            <th className="px-2 py-1 text-left uppercase tracking-wider font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-1 text-slate-700 dark:text-slate-300">
              {children}
            </td>
          ),
          hr: () => (
            <hr className="my-2 border-slate-200 dark:border-slate-800" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
