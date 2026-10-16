// CBLM reference names for the result screen (docs/DATA.md).
export const CBLM_NAMES: Record<number, string> = {
  1: "Work Effectively within TVET Sector",
  2: "Practice Inclusivity in a CBT&A Environment",
  3: "Apply OSH Practice in a CBT&A Environment",
  4: "Apply ICT to Facilitate Training and Assessment",
  5: "Maintain and Enhance Professional Practice",
  6: "Maintain Training Equipment and Facility",
  7: "Maintain and Enhance Technical Competency",
  8: "Design and Modify CBT Learning Material and Resources",
  9: "Plan and Organise Competency Based Training Sessions",
  10: "Deliver Competency Based Training",
  11: "Design Competency Based Assessment",
  12: "Organise and Conduct Competency Assessment",
};

// "CBLM 2 · Practice Inclusivity in a CBT&A Environment · Page 6" — page only once Arif reviewed it.
export function cblmRef(no: number | null, page: string | null, reviewed: boolean): string | null {
  if (!no) return null;
  const parts = [`CBLM ${no}`, CBLM_NAMES[no]];
  if (page && reviewed) parts.push(`Page ${page}`);
  return parts.filter(Boolean).join(" · ");
}
