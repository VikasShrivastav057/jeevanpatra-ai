/** Print an isolated A4 document so editor columns and mobile widths cannot clip it. */
export async function printBiodata(paper: HTMLElement) {
  const frame = document.createElement('iframe');
  frame.title = 'Biodata PDF';
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0';
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.documentElement.innerHTML = '<head><title>JeevanPatra Biodata</title></head><body></body>';
  const loads = [...document.querySelectorAll('link[rel="stylesheet"],style')].map(node => {
    const copy = node.cloneNode(true) as HTMLElement;
    const loaded = copy instanceof HTMLLinkElement ? new Promise<void>((resolve, reject) => { copy.onload = () => resolve(); copy.onerror = () => reject(new Error('PDF styles could not load. Please retry.')); }) : Promise.resolve();
    doc.head.appendChild(copy);
    return loaded;
  });
  const style = doc.createElement('style');
  style.textContent = '@page{size:A4 portrait;margin:0}html,body{margin:0!important;padding:0!important;width:210mm!important;height:297mm!important;overflow:hidden!important;background:white}.bio-paper{box-sizing:border-box!important;width:210mm!important;max-width:none!important;min-width:0!important;height:297mm!important;min-height:0!important;max-height:297mm!important;margin:0!important;box-shadow:none!important;border-radius:0!important;overflow:hidden!important;break-inside:avoid;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}';
  doc.head.appendChild(style);
  doc.body.appendChild(paper.cloneNode(true));
  try {
    await Promise.all(loads);
    await doc.fonts.ready;
    await Promise.all([...doc.images].map(img => img.decode().catch(() => { throw new Error('Your photo is still loading. Please retry the download.'); })));
    // Preload background artwork too; CSS background requests are not in doc.images.
    const background = frame.contentWindow!.getComputedStyle(doc.querySelector('.bio-paper')!).backgroundImage;
    const urls = [...background.matchAll(/url\(["']?(.*?)["']?\)/g)].map(match => match[1]);
    await Promise.all(urls.map(src => new Promise<void>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(); img.onerror = () => reject(new Error('Template artwork could not load. Please retry.')); img.src = src; })));
    frame.contentWindow!.addEventListener('afterprint', () => frame.remove(), { once: true });
    frame.contentWindow!.focus();
    frame.contentWindow!.print();
  } catch (error) { frame.remove(); throw error; }
}
