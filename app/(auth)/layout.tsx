export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div 
      className="flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat relative overflow-x-hidden"
      style={{ backgroundImage: 'url("/bridge-bg.jpg")' }}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"></div>
      <div className="w-full max-w-md px-4 sm:px-6 relative z-10 mx-auto">
        {children}
      </div>
    </div>
  )
}
