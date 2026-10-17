import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crocker Digital Signage",
  description: "Signage content management for Crocker FFA and Crocker R-II screens.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
