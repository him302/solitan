import { redirect } from 'next/navigation';

/** Root route. Real auth-aware routing is added later; for now send to login. */
export default function Home() {
  redirect('/login');
}
