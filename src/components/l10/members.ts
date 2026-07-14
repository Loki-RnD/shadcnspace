// HOD team roster — mirrors core.users on Neon (see db/migrations/0002).
// Static placeholder until session auth lands; the admin page reads live data.

export interface L10Member {
  id: string;
  name: string;
  initials: string;
  email: string;
  area: string;
  systemRole: "super_admin" | "hod";
  companyRole: string;
  /** avatar chip classes — chart palette tints */
  color: string;
}

export const l10Members: L10Member[] = [
  {
    id: "dennis",
    name: "Dennis Babu",
    initials: "DB",
    email: "dennisn@loki-ventures.com",
    area: "Supply Chain",
    systemRole: "super_admin",
    companyRole: "HOD",
    color: "bg-[#f05100]/15 text-[#f05100] dark:bg-[#f05100]/25",
  },
  {
    id: "taha",
    name: "Taha Mohamedali",
    initials: "TM",
    email: "taham@loki-ventures.com",
    area: "Executive",
    systemRole: "super_admin",
    companyRole: "Visionary (CEO)",
    color: "bg-[#104e64]/15 text-[#104e64] dark:bg-[#104e64]/25 dark:text-[#7fb6c9]",
  },
  {
    id: "judy",
    name: "Judy Gachumi",
    initials: "JG",
    email: "judyg@loki-ventures.com",
    area: "Marketing & Sales",
    systemRole: "hod",
    companyRole: "HOD",
    color: "bg-[#fcbb00]/20 text-[#8a6700] dark:bg-[#fcbb00]/25 dark:text-[#fcbb00]",
  },
  {
    id: "cate",
    name: "Cate Kariuki",
    initials: "CK",
    email: "catek@loki-ventures.com",
    area: "Finance",
    systemRole: "hod",
    companyRole: "HOD",
    color: "bg-[#009588]/15 text-[#009588] dark:bg-[#009588]/25",
  },
  {
    id: "benard",
    name: "Benard Nyasimi",
    initials: "BN",
    email: "benardn@loki-ventures.com",
    area: "Sales",
    systemRole: "hod",
    companyRole: "HOD",
    color: "bg-[#f99c00]/15 text-[#b06e00] dark:bg-[#f99c00]/25 dark:text-[#f99c00]",
  },
  {
    id: "joram",
    name: "Joram Okute",
    initials: "JO",
    email: "joramo@loki-ventures.com",
    area: "Warehouse",
    systemRole: "hod",
    companyRole: "HOD",
    color: "bg-[#009588]/10 text-[#0b6e63] dark:bg-[#009588]/20 dark:text-[#4dc3b8]",
  },
  {
    id: "navin",
    name: "Navin Patel",
    initials: "NP",
    email: "navinp@loki-ventures.com",
    area: "Dispatch",
    systemRole: "hod",
    companyRole: "HOD",
    color: "bg-[#f05100]/10 text-[#b03c00] dark:bg-[#f05100]/20 dark:text-[#f58a52]",
  },
];

export const currentUser = l10Members[0];
