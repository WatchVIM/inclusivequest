import "./globals.css";
import type { Metadata } from "next";
import { Nav } from "../components/Nav";

export const metadata: Metadata = {
  title: "InclusiveQuest",
  description: "YouTube feed + ASL avatar panel for Deaf viewers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto max-w-7xl px-4 pb-14">{children}</main>
      </body>
    </html>
  );
}
