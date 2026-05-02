import { redirect } from 'next/navigation'

// /redesign was a dev-time alternate landing during the cinematic
// redesign port. The canonical landing at / now embodies that
// direction, so this route permanently redirects home.
export default function RedesignPage() {
  redirect('/')
}
