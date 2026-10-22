import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { buildPublicContent, fetchPublicContent } from './public-reader.js';

const ContentContext = createContext(null);
const fallbackContent = buildPublicContent();

export function ContentProvider({ children, previewDocuments }) {
  const isPreview = previewDocuments !== undefined;
  const [publishedContent, setPublishedContent] = useState(fallbackContent);
  const previewContent = useMemo(() => isPreview ? buildPublicContent(previewDocuments, { preview: true }) : null,
    [isPreview, previewDocuments]);
  useEffect(() => {
    if (isPreview || import.meta.env.VITE_CMS_ENABLED !== 'true') return undefined;
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    fetchPublicContent({ signal: controller.signal }).then((content) => { if (active) setPublishedContent(content); })
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [isPreview]);
  const value = useMemo(() => ({ ...(previewContent || publishedContent), previewMode: isPreview }), [previewContent, publishedContent, isPreview]);
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  return useContext(ContentContext) || fallbackContent;
}
