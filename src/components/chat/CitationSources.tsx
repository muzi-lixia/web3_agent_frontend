import type { RagHit } from '@/types/rag';

function sourceLink(url: string): string | null {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

export function CitationSources({ citations }: { citations: RagHit[] }) {
  if (!citations.length) return null;
  return (
    <details className="mt-3 border-t border-line pt-2 text-xs text-ink-2">
      <summary className="cursor-pointer text-ink-3 hover:text-mint">
        参考资料（{citations.length}）
      </summary>
      <ul className="mt-2 space-y-2">
        {citations.map((citation) => {
          const url = sourceLink(citation.source_url);
          return (
            <li key={`${citation.id}-${citation.chunk_id}`} className="rounded-lg border border-line px-3 py-2">
              <div className="break-words font-medium">
                <span className="mr-1 text-mint">[{citation.id}]</span>
                {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">{citation.title}</a> : citation.title}
              </div>
              <div className="mt-1 break-words text-ink-3">
                {[citation.section, citation.version && `版本 ${citation.version}`,
                  citation.page_number && `第 ${citation.page_number}${citation.page_end && citation.page_end !== citation.page_number ? `–${citation.page_end}` : ''} 页`,
                  citation.kb_id && `知识库 ${citation.kb_id}`].filter(Boolean).join(' · ')}
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
