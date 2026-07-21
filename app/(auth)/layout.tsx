export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col relative overflow-x-hidden">
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: 'url("/bridge-bg.jpg")' }}
      >
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"></div>
      </div>
      <div className="w-full max-w-md px-4 sm:px-6 py-6 sm:py-12 relative z-10 mx-auto my-auto">
        {children}
      </div>
    </div>
  )
}
