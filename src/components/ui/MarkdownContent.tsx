import { useEffect, useRef, useState, type ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "neutral",
  fontFamily: "inherit",
  securityLevel: "loose",
});

let mermaidCounter = 0;

function MermaidBlock({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = `mermaid-${++mermaidCounter}`;

    mermaid
      .render(id, chart.trim())
      .then(({ svg: rendered }) => {
        if (!cancelled) setSvg(rendered);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (error) {
    return (
      <pre className="text-[0.72rem] text-danger bg-danger-light/30 border border-danger/20 rounded-lg px-4 py-3 overflow-x-auto whitespace-pre-wrap">
        {chart}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center py-6 text-[0.72rem] text-text-muted">
        渲染图表中...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-2 overflow-x-auto flex justify-center [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

type MarkdownContentProps = {
  content: string;
  className?: string;
};

const mdComponents: ComponentProps<typeof ReactMarkdown>["components"] = {
  p({ children }) {
    return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
  },
  h1({ children }) {
    return <h1 className="text-[1rem] font-bold text-text mt-4 mb-2 first:mt-0">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="text-[0.92rem] font-bold text-text mt-3 mb-1.5 first:mt-0">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-[0.85rem] font-semibold text-text mt-2.5 mb-1 first:mt-0">{children}</h3>;
  },
  h4({ children }) {
    return <h4 className="text-[0.82rem] font-semibold text-text mt-2 mb-1 first:mt-0">{children}</h4>;
  },
  ul({ children }) {
    return <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>;
  },
  li({ children }) {
    return <li className="leading-relaxed">{children}</li>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-3 border-primary/40 pl-3 my-2 text-text-muted italic">
        {children}
      </blockquote>
    );
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto my-2">
        <table className="w-full text-[0.72rem] border-collapse">{children}</table>
      </div>
    );
  },
  thead({ children }) {
    return <thead>{children}</thead>;
  },
  tbody({ children }) {
    return <tbody>{children}</tbody>;
  },
  tr({ children }) {
    return <tr className="border-b border-border-light/50 last:border-b-0">{children}</tr>;
  },
  th({ children }) {
    return (
      <th className="text-left px-2.5 py-1.5 bg-bg-alt text-text-muted font-medium border-b border-border-light first:rounded-tl-md last:rounded-tr-md">
        {children}
      </th>
    );
  },
  td({ children }) {
    return <td className="px-2.5 py-1.5 text-text-secondary">{children}</td>;
  },
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        {children}
      </a>
    );
  },
  hr() {
    return <hr className="my-3 border-border-light" />;
  },
  strong({ children }) {
    return <strong className="font-semibold text-text">{children}</strong>;
  },
  em({ children }) {
    return <em className="italic">{children}</em>;
  },
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    const lang = match?.[1];
    const codeStr = String(children).replace(/\n$/, "");

    if (lang === "mermaid") {
      return <MermaidBlock chart={codeStr} />;
    }

    const isInline = !className && !String(children).includes("\n");

    if (isInline) {
      return (
        <code className="px-1.5 py-0.5 rounded bg-bg-alt text-[0.75rem] font-mono text-primary/90" {...props}>
          {children}
        </code>
      );
    }

    return (
      <div className="my-2 rounded-lg overflow-hidden border border-border-light">
        {lang && (
          <div className="px-3 py-1 bg-bg-alt text-[0.62rem] text-text-muted font-mono border-b border-border-light">
            {lang}
          </div>
        )}
        <pre className="px-4 py-3 overflow-x-auto bg-bg/80">
          <code className="text-[0.75rem] font-mono leading-relaxed text-text-secondary" {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  },
  pre({ children }) {
    return <>{children}</>;
  },
};

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
