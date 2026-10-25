import type { Metadata } from "next";
import "./globals.css";
import "./premium-theme.css";

export const metadata: Metadata = {
  title: "Gig 'eats · Find your next favorite bite",
  description: "Explore 190 College Station food spots on an interactive map. Find menus, save restaurants, and share genuine Aggie reviews.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
