import { redirect } from "next/navigation";

// The portfolio lives at /photography — the root just hands visitors over.
export default function HomePage() {
  redirect("/photography");
}
