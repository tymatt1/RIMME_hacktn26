import './CarebridgeLogo.css'
import { bridgePaths } from '../lib/brand.js'

export function BridgeMark({ className = '' }) {
  return <svg className={className} viewBox="0 0 36 36" fill="none" aria-hidden="true">
    {bridgePaths.map((path) => <path key={path} d={path} stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />)}
  </svg>
}

export default function CarebridgeLogo({ onClick }) {
  const Element = onClick ? 'button' : 'div'
  return <Element className="carebridge-logo" type={onClick ? 'button' : undefined} onClick={onClick} aria-label={onClick ? 'Carebridge home' : 'Carebridge'}>
    <BridgeMark className="carebridge-logo-mark" />
    <span>carebridge<span className="carebridge-logo-dot">.</span></span>
  </Element>
}
