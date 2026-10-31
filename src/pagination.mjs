export function paginateParagraphs(paragraphs, fits) {
  const pages = [];
  paragraphs.forEach((text, paragraph) => {
    const characters = Array.from(text);
    let start = 0;
    while (start < characters.length) {
      let low = start + 1;
      let high = characters.length;
      let end = low;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        if (fits(characters.slice(start, middle).join(""))) {
          end = middle;
          low = middle + 1;
        } else high = middle - 1;
      }
      if (end < characters.length) {
        const floor = start + Math.floor((end - start) * 0.65);
        for (let boundary = end; boundary > floor; boundary -= 1) {
          if (/[\s，。；！？、,.!?;]/u.test(characters[boundary - 1])) {
            end = boundary;
            break;
          }
        }
      }
      pages.push({ paragraph, start, end, text: characters.slice(start, end).join("") });
      start = end;
    }
  });
  return pages;
}

export function correspondingPage(pages, paragraphs, previousPage, previousParagraphs) {
  if (!previousPage || !pages.length) return 0;
  const paragraph = Math.min(previousPage.paragraph, paragraphs.length - 1);
  const previousLength = Array.from(previousParagraphs[previousPage.paragraph] ?? "").length || 1;
  const position = previousPage.start / previousLength * Array.from(paragraphs[paragraph]).length;
  const found = pages.findIndex((page) => page.paragraph === paragraph && page.end > position);
  return found >= 0 ? found : Math.max(0, pages.length - 1);
}
