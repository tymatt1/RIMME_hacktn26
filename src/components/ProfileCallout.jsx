import { useRef } from 'react'
import Icon from './Icon.jsx'

export default function ProfileCallout({ caregiverName, personName, memberCount, storageSaved, onFamily }) {
  const ref = useRef(null)
  const avatarRef = useRef(null)
  const displayName = caregiverName || 'Your family workspace'

  function openFamily() {
    ref.current.hidePopover()
    onFamily()
  }

  return <>
    <button className="avatar" popoverTarget="workspace-profile" aria-haspopup="dialog" aria-label="Open your profile" ref={avatarRef}>{(caregiverName || 'Y')[0].toUpperCase()}</button>
    <section id="workspace-profile" className="profile-callout" popover="auto" role="dialog" aria-labelledby="workspace-profile-title" ref={ref} onToggle={(event) => { if (event.newState === 'open') event.currentTarget.style.top = `${avatarRef.current.getBoundingClientRect().bottom + 10}px` }}>
      <div className="profile-callout-heading"><span className="member-avatar">{(caregiverName || 'Y')[0].toUpperCase()}</span><div><h2 id="workspace-profile-title">{displayName}</h2></div><button className="icon-button" popoverTarget="workspace-profile" popoverTargetAction="hide" aria-label="Close profile" autoFocus><Icon name="close" size={18} /></button></div>
      <dl><div><dt>Planning for</dt><dd>{personName}</dd></div><div><dt>Family members</dt><dd>{memberCount} {memberCount === 1 ? 'person' : 'people'}</dd></div></dl>
      <p className="profile-save-status"><Icon name="shield" size={16} />{storageSaved ? 'Your plan is saved on this device.' : 'Download your plan to keep a copy.'}</p>
      <button className="button secondary full" onClick={openFamily}>View family members <Icon name="people" size={17} /></button>
    </section>
  </>
}
