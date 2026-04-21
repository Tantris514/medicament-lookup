const COLORS: [string, string][] = [
  ["bg-blue-100", "text-blue-700"],
  ["bg-emerald-100", "text-emerald-700"],
  ["bg-amber-100", "text-amber-700"],
  ["bg-rose-100", "text-rose-700"],
  ["bg-purple-100", "text-purple-700"],
  ["bg-cyan-100", "text-cyan-700"],
  ["bg-orange-100", "text-orange-700"],
  ["bg-teal-100", "text-teal-700"],
  ["bg-pink-100", "text-pink-700"],
  ["bg-lime-100", "text-lime-700"],
  ["bg-indigo-100", "text-indigo-700"],
  ["bg-yellow-100", "text-yellow-700"],
  ["bg-red-100", "text-red-700"],
  ["bg-sky-100", "text-sky-700"],
  ["bg-violet-100", "text-violet-700"],
];

const categoryMap = new Map<string, [string, string]>();

export function initTags(categories: string[]): void {
  categories.forEach((cat, i) => {
    categoryMap.set(cat, COLORS[i % COLORS.length]);
  });
}

export function tagHTML(category: string): string {
  const [bg, text] = categoryMap.get(category) ?? COLORS[0];
  return `<span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${text}">${category}</span>`;
}

export function getTagClasses(category: string): string {
  const [bg, text] = categoryMap.get(category) ?? COLORS[0];
  return `${bg} ${text}`;
}
