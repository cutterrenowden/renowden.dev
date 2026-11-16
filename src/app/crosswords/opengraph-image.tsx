import { previewImage } from "@/components/crossword/preview";
import { listCrosswords } from "@/lib/crosswords";

export { contentType, size } from "@/components/crossword/preview";
export const alt = "Crosswords by Cutter Renowden";

// The section's card shows the newest puzzle's grid.
export default function Image() {
  return previewImage(
    { label: "Cutter Renowden", title: "Crosswords", detail: "As seen in the Yale Daily News" },
    listCrosswords()[0],
  );
}
