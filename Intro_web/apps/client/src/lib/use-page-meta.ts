import { useEffect } from "react";

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = `${title} | 에너지기술서비스(주)`;
    const descriptionTag = document.querySelector('meta[name="description"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    descriptionTag?.setAttribute("content", description);
    ogTitle?.setAttribute("content", title);
    ogDescription?.setAttribute("content", description);
    twitterTitle?.setAttribute("content", title);
    twitterDescription?.setAttribute("content", description);
  }, [description, title]);
}
