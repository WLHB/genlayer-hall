/** 地址缩写显示：0x1234…abcd；非地址原样返回 */
export function shortAddr(addr: string): string {
  if (/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }
  return addr;
}

/** 是否合法地址 */
export function isAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

/** 由地址确定性生成 blockies 风格 identicon（SVG data URI，无依赖） */
export function identiconFor(addr: string): string {
  const s = addr.toLowerCase().replace(/^0x/, "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const palette = [
    ["#e6b84c", "#201603"],
    ["#5eead4", "#062a24"],
    ["#ff8a5c", "#2a0f05"],
    ["#9aa0ff", "#0d0d2b"],
    ["#ff6b81", "#2b0a10"],
    ["#f4cf74", "#2a1f08"],
  ];
  const [fg, bg] = palette[h % palette.length];
  const cells: boolean[] = [];
  for (let i = 0; i < 15; i++) cells.push(((h >>> i) & 1) === 1);
  let rects = "";
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      if (!cells[row * 3 + col]) continue;
      rects += `<rect x="${col * 10}" y="${row * 10}" width="10" height="10" fill="${fg}"/>`;
      const rc = 4 - col;
      if (rc !== col)
        rects += `<rect x="${rc * 10}" y="${row * 10}" width="10" height="10" fill="${fg}"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" shape-rendering="crispEdges"><rect width="50" height="50" fill="${bg}"/>${rects}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
