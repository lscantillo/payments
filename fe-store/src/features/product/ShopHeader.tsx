import { Link } from 'react-router'

export function ShopHeader() {
  return (
    <header className="masthead">
      <Link className="mark" to="/">
        Atelier
      </Link>
      <p className="mark-note">Taller de cerámica</p>
    </header>
  )
}
