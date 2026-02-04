import './globals.css'

export const metadata = { 
  title: 'Mission Control',
  description: 'Family dashboard for chores, meals, and more'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-900">
        {children}
      </body>
    </html>
  )
}
