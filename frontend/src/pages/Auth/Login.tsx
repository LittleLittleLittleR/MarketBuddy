import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import Loading from '@/components/Loading'
import LoginForm from './components/LoginForm';

export default function Login() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate()

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()

      if (data?.user) {
        console.log("User already logged in...")
        navigate('/dashboard')
      } else {
        setCheckingAuth(false)
      }
    }

    checkUser()
  }, [navigate])

  if (checkingAuth) {
    return (
      <Loading />
    )
  }

  return (
    <main className="flex min-h-screen justify-center bg-background px-4">
      <LoginForm />
    </main>
  )
}
