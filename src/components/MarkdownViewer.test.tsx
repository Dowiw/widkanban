import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarkdownViewer } from './MarkdownViewer';
import * as openUrlUtil from '../utils/openUrl';

describe('MarkdownViewer', () => {
  it('returns null if content is empty or only whitespace', () => {
    const { container } = render(<MarkdownViewer content="   " />);
    expect(container.firstChild).toBeNull();
  });

  it('renders standard markdown headings, bold, and paragraphs', () => {
    const markdown = `# Main Title\n\n**Bold Text** and *Italic Text*`;
    render(<MarkdownViewer content={markdown} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Main Title');
    expect(screen.getByText('Bold Text')).toBeInTheDocument();
    expect(screen.getByText('Italic Text')).toBeInTheDocument();
  });

  it('renders GFM task checklist items', () => {
    const markdown = `- [ ] Pending item\n- [x] Completed item`;
    const { container } = render(<MarkdownViewer content={markdown} />);

    expect(screen.getByText('Pending item')).toBeInTheDocument();
    expect(screen.getByText('Completed item')).toBeInTheDocument();
    // Two SVG icons for checkbox states
    expect(container.querySelectorAll('svg')).toHaveLength(2);
  });

  it('renders inline code and multiline code block with monospace font', () => {
    const markdown = "Here is `const x = 1;` inline.\n\n```typescript\nfunction hello() {\n  return 'world';\n}\n```";
    const { container } = render(<MarkdownViewer content={markdown} />);

    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    expect(screen.getByText(/function hello/)).toBeInTheDocument();
    const codes = container.querySelectorAll('code');
    expect(codes.length).toBeGreaterThanOrEqual(2);
    codes.forEach((c) => {
      expect(c.className).toContain('font-mono');
    });
  });

  it('delegates hyperlink clicks to safeOpenUrl and prevents default navigation', () => {
    const safeOpenUrlSpy = vi.spyOn(openUrlUtil, 'safeOpenUrl').mockImplementation(async () => {});
    const markdown = `Check out [WidKanban](https://github.com/Dowiw/widkanban) for details.`;
    render(<MarkdownViewer content={markdown} />);

    const link = screen.getByRole('link', { name: /WidKanban/i });
    expect(link).toHaveAttribute('href', 'https://github.com/Dowiw/widkanban');

    fireEvent.click(link);
    expect(safeOpenUrlSpy).toHaveBeenCalledWith('https://github.com/Dowiw/widkanban');

    safeOpenUrlSpy.mockRestore();
  });

  it('renders markdown tables correctly', () => {
    const markdown = `| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |`;
    render(<MarkdownViewer content={markdown} />);

    expect(screen.getByText('Header 1')).toBeInTheDocument();
    expect(screen.getByText('Cell 1')).toBeInTheDocument();
    expect(screen.getByText('Cell 2')).toBeInTheDocument();
  });

  it('renders blockquotes with italic styling', () => {
    const markdown = `> This is a notable blockquote.`;
    const { container } = render(<MarkdownViewer content={markdown} />);

    const blockquote = container.querySelector('blockquote');
    expect(blockquote).toBeInTheDocument();
    expect(blockquote).toHaveTextContent('This is a notable blockquote.');
  });

  it('renders task list items with inline code chips cleanly without breaking layout', () => {
    const markdown = `- [ ] Pull requests linking to issues via \`fixes #X\` / \`closes #X\` are automatically tied together.`;
    const { container } = render(<MarkdownViewer content={markdown} />);

    expect(screen.getByText('fixes #X')).toBeInTheDocument();
    expect(screen.getByText('closes #X')).toBeInTheDocument();
    const li = container.querySelector('li');
    expect(li).toHaveClass('task-list-item');
    // Ensure li is not flex (which breaks inline text flow)
    expect(li?.className).not.toContain('flex');
    const codes = container.querySelectorAll('code');
    expect(codes).toHaveLength(2);
    codes.forEach((c) => {
      expect(c.className).toContain('whitespace-nowrap');
    });
  });
});

