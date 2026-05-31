import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Props = {}

export default function Navbar(props: Props) {
  const [userEmail, setUserEmail] = useState('')
  // const [username, setUsername] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          setUserEmail(user.email || '')
          // TODO: Can add username next time but email works for now
        }
      } catch (error) {
        console.error("Error checking auth state:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()

    // sync state immediately if user logs in or out anywhere across the app
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUserEmail('')
        // setUsername('')
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUserEmail(session.user.email || '')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const getFallbackLetter = () => {
    const displayName = userEmail || 'U'
    return displayName.charAt(0).toUpperCase()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

        {/* Top Left: Logo / Title */}
        <div>
          <Link to="/" className="text-xl font-semibold tracking-tight hover:opacity-90">
            MarketBuddy
          </Link>
        </div>

        {/* Top Right: Auth Actions */}
        <div className="flex items-center gap-4">
          {isLoading ? (
            <span className="text-sm text-muted-foreground">Loading...</span>
          ) : userEmail ? (
            <>
              <span className="hidden text-sm text-muted-foreground md:block">
                {userEmail}
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
                    <Avatar>
                      <AvatarFallback>{getFallbackLetter()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Login
              </Button>
              <Button onClick={() => navigate('/signup')}>
                Sign up
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
