export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-[100dvh] flex-col relative overflow-hidden">
      <div 
        className="fixed inset-0 bg-cover bg-[80%_center] md:bg-center bg-no-repeat z-0"
        style={{ backgroundImage: 'url("/bridge-bg.jpg")' }}
      >
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"></div>
      </div>
      <div className="w-full max-w-md px-4 sm:px-6 relative z-10 mx-auto my-auto">
        {children}
      </div>
    </div>
  )
}
