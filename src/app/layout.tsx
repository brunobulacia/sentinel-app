
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
