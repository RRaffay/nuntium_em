import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // Import KaTeX CSS

interface MarkdownContentProps {
  content: string;
  useMathPlugins?: boolean;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, useMathPlugins = false }) => {
  const processedContent = useMathPlugins
    ? content
      .replace(/\\\[/g, '$$')
      .replace(/\\\]/g, '$$')
      .replace(/\\:/g, ':')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
    : content;

  const remarkPlugins = useMathPlugins ? [remarkGfm, remarkMath] : [remarkGfm];
  const rehypePlugins = useMathPlugins ? [rehypeKatex] : [];

  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={{
        p: ({ children }) => <p className="mb-4">{children}</p>,
        h1: ({ children }) => <h1 className="text-2xl font-bold mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-bold mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
        h4: ({ children }) => <h4 className="text-md font-bold mb-2">{children}</h4>,
        h5: ({ children }) => <h5 className="text-sm font-bold mb-2">{children}</h5>,
        h6: ({ children }) => <h6 className="text-xs font-bold mb-2">{children}</h6>,
        ul: ({ children }) => <ul className="list-disc pl-5 mb-4">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-4">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-blue-500 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
      }}
    >
      {processedContent}
    </ReactMarkdown>
  );
};