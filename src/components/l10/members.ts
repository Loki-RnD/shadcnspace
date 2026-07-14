// HOD team roster — placeholder for l10.members until Supabase is wired.
// Owners sourced from docs/METRIC_MAP.md; colors follow the chart palette.

export interface L10Member {
  id: string;
  name: string;
  initials: string;
  area: string;
  role: "integrator" | "member";
  /** avatar chip classes — chart palette tints */
  color: string;
}

export const l10Members: L10Member[] = [
  {
    id: "dennis",
    name: "Dennis Babu",
    initials: "DB",
    area: "Supply Chain",
    role: "integrator",
    color: "bg-[#f05100]/15 text-[#f05100] dark:bg-[#f05100]/25",
  },
  {
    id: "cate",
    name: "Cate",
    initials: "CA",
    area: "Finance",
    role: "member",
    color: "bg-[#009588]/15 text-[#009588] dark:bg-[#009588]/25",
  },
  {
    id: "navin",
    name: "Navin",
    initials: "NA",
    area: "Dispatch",
    role: "member",
    color: "bg-[#104e64]/15 text-[#104e64] dark:bg-[#104e64]/25 dark:text-[#7fb6c9]",
  },
  {
    id: "judy",
    name: "Judy",
    initials: "JU",
    area: "Marketing",
    role: "member",
    color: "bg-[#fcbb00]/20 text-[#8a6700] dark:bg-[#fcbb00]/25 dark:text-[#fcbb00]",
  },
  {
    id: "joram",
    name: "Joram",
    initials: "JO",
    area: "Warehouse",
    role: "member",
    color: "bg-[#f99c00]/15 text-[#b06e00] dark:bg-[#f99c00]/25 dark:text-[#f99c00]",
  },
  // Two seats pending names — team of 7 per leadership roster.
  {
    id: "seat-6",
    name: "HOD Six",
    initials: "H6",
    area: "TBD",
    role: "member",
    color: "bg-[#009588]/10 text-[#0b6e63] dark:bg-[#009588]/20 dark:text-[#4dc3b8]",
  },
  {
    id: "seat-7",
    name: "HOD Seven",
    initials: "H7",
    area: "TBD",
    role: "member",
    color: "bg-[#f05100]/10 text-[#b03c00] dark:bg-[#f05100]/20 dark:text-[#f58a52]",
  },
];

export const currentUser = l10Members[0];
