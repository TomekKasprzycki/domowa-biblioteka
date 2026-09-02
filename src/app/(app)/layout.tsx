import Sidebar from "@/app/_components/sidebar";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="grid min-h-screen grid-cols-1 min-[860px]:grid-cols-[248px_1fr]">
      <Sidebar />
      <main className="min-w-0 px-[18px] pt-6 pb-[60px] min-[860px]:px-10 min-[860px]:pt-8 min-[860px]:pb-20">
        {children}
      </main>
    </div>
  );
}
