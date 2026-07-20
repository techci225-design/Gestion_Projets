export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div 
      className="flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: 'url("/bridge-bg.png")' }}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"></div>
      <div className="w-full max-w-md p-6 relative z-10">
        {children}
      </div>
    </div>
  )
}
