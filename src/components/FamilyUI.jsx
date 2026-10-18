import { useState } from 'react'
import Icon from './Icon.jsx'
import { findInvite } from '../lib/demo-accounts.js'
import { formatInviteCode, normalizeInviteCode, relationshipOptions, statusLabels } from '../lib/family.js'

const roleLabels = { main: 'Main family contact', member: 'Family member', group: 'Anyone in the family' }

function RelationshipSelect({ defaultValue = '', label = 'Relationship to the resident' }) {
  const known = relationshipOptions.includes(defaultValue) || !defaultValue
  return <label className="text-field">{label}<span className="optional">Optional</span>
    <select name="relationship" defaultValue={defaultValue}>
      <option value="">Choose one</option>
      {relationshipOptions.map((option) => <option key={option} value={option}>{option}</option>)}
      {!known && <option value={defaultValue}>{defaultValue}</option>}
    </select>
  </label>
}

export function FamilyList({ family, taskCounts, youName, canInvite = true, onEdit, onInvite, onShowInvite }) {
  return <div className="family-list">{family.map((person, index) => {
    const isYou = youName === person.name
    const contact = [person.phone, person.email].filter(Boolean)
    return <div className="family-member" key={person.name}>
      <span className={`member-avatar member-${index % 3}`}>{person.displayName[0]}</span>
      <span className="family-info">
        <strong>{person.displayName}{isYou && <em className="you-tag"> (you)</em>}</strong>
        <small>{[roleLabels[person.role], person.relationship].filter(Boolean).join(' · ')}</small>
        {person.role !== 'group' && (contact.length
          ? <small className="family-contact">{contact.join(' · ')}</small>
          : <small className="family-contact missing">No phone or email yet</small>)}
        {person.role !== 'group' && <span className="family-flags">
          <span className={`status-chip status-${person.status}`}>{statusLabels[person.status]}</span>
          {person.role === 'member' && !person.shareWithHome && <span className="status-chip status-private">Not on the nursing-home sheet</span>}
        </span>}
      </span>
      <span className="family-side">
        <span>{taskCounts[person.name] || 0} tasks</span>
        {person.role !== 'group' && <span className="family-actions">
          <button type="button" className="text-button" onClick={() => onEdit(person)}><Icon name="edit" size={15} />Edit details</button>
          {canInvite && person.role === 'member' && person.status === 'listed' && <button type="button" className="text-button" onClick={() => onInvite(person)}><Icon name="plus" size={15} />Invite</button>}
          {canInvite && person.role === 'member' && person.status === 'invited' && <button type="button" className="text-button" onClick={() => onShowInvite(person)}><Icon name="arrow" size={15} />Invite link</button>}
        </span>}
      </span>
    </div>
  })}</div>
}

// Add a new person, or change the details of someone on the list. `onSubmit` returns an error message to show, or nothing.
export function MemberForm({ person, onSubmit, residentName, canInvite = true }) {
  const editing = Boolean(person)
  const [error, setError] = useState('')
  const [how, setHow] = useState('list')
  return <form className="account-form member-form" onSubmit={(event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const message = onSubmit({
      name: String(data.get('member') || person?.name || '').trim(),
      relationship: String(data.get('relationship') || ''),
      phone: String(data.get('phone') || ''),
      email: String(data.get('email') || ''),
      shareWithHome: data.get('shareWithHome') === 'on',
      invite: !editing && canInvite && how === 'invite',
    })
    setError(message || '')
  }}>
    {editing
      ? <p className="member-form-name"><strong>{person.displayName}</strong><small>{roleLabels[person.role]}</small></p>
      : <label className="text-field">First name or nickname<input name="member" required maxLength={40} placeholder="e.g. Daniel" autoComplete="off" /></label>}
    <RelationshipSelect defaultValue={person?.relationship || ''} label={person?.role === 'main' ? `Your relationship to ${residentName}` : `Relationship to ${residentName}`} />
    <div className="field-columns">
      <label className="text-field">Phone<span className="optional">Optional</span><input name="phone" type="tel" inputMode="tel" autoComplete="off" maxLength={30} defaultValue={person?.phone || ''} placeholder="(615) 555-0142" /></label>
      {person?.hasAccount
        ? <div className="text-field">Email<p className="fixed-email">{person.email}<small>This is their sign-in email.</small></p></div>
        : <label className="text-field">Email<span className="optional">Optional</span><input name="email" type="email" autoComplete="off" maxLength={120} defaultValue={person?.email || ''} placeholder="daniel@example.com" /></label>}
    </div>
    {person?.role !== 'main' && <label className="check-row"><input type="checkbox" name="shareWithHome" defaultChecked={person ? person.shareWithHome : true} /><span><strong>Include on the sheet for the nursing home</strong><small>Only people with a phone or email are listed. Ask them first.</small></span></label>}
    {person?.role === 'main' && <input type="hidden" name="shareWithHome" value="on" />}
    {!editing && canInvite && <fieldset className="invite-choice">
      <legend>How should they take part?</legend>
      <label><input type="radio" name="how" value="list" checked={how === 'list'} onChange={() => setHow('list')} /><span><strong>Add to the forms only</strong><small>You enter their details. They don’t need an account.</small></span></label>
      <label><input type="radio" name="how" value="invite" checked={how === 'invite'} onChange={() => setHow('invite')} /><span><strong>Also invite them to Carebridge</strong><small>They get a link and a code, register with their own contact details, and see this plan.</small></span></label>
    </fieldset>}
    <p className="field-hint">Demo only. Use made-up phone numbers and emails. Nothing here is sent anywhere.</p>
    {error && <p className="account-error" role="alert">{error}</p>}
    <button className="button primary" type="submit">{editing ? 'Save details' : canInvite && how === 'invite' ? 'Add and create invite' : 'Add family member'}<Icon name={editing ? 'arrow' : 'plus'} size={17} /></button>
  </form>
}

// Shows the link and code for an invite, and how to use them in this demo.
export function InviteReady({ invite, link, ownerName, mailto, onCopy, onCancel }) {
  return <div className="invite-ready">
    <p className="field-hint">Share this with {invite.memberName}. They register with their own name, email and phone, and then see this plan.</p>
    <div className="invite-code" aria-label={`Invite code ${formatInviteCode(invite.code)}`}>{formatInviteCode(invite.code)}</div>
    <label className="text-field">Invite link<input readOnly value={link} onFocus={(event) => event.target.select()} /></label>
    <div className="invite-actions">
      <button type="button" className="button primary" onClick={() => onCopy(link, 'Invite link copied.')}><Icon name="plus" size={16} />Copy link</button>
      <button type="button" className="button secondary" onClick={() => onCopy(formatInviteCode(invite.code), 'Invite code copied.')}>Copy code</button>
      {mailto && <a className="button secondary" href={mailto}>Email the invite</a>}
    </div>
    <div className="account-demo-note"><Icon name="shield" size={18} /><span>Demo: plans are kept in this browser, so the invite works on this device. Open the link in a new tab, or choose <strong>Join a family plan</strong> on the home screen and enter the code.{ownerName ? ` The invite shows ${ownerName} as the person inviting.` : ''} Sharing across devices needs the Carebridge backend, which isn’t connected to accounts yet.</span></div>
    <button type="button" className="text-button" onClick={onCancel}>Cancel this invite</button>
  </div>
}

// Registers a family member against an invite. `onSubmit` returns an error message to show, or nothing.
export function JoinForm({ initialCode = '', onSubmit }) {
  const [code, setCode] = useState(formatInviteCode(initialCode))
  const [error, setError] = useState('')
  const normalized = normalizeInviteCode(code)
  const invite = normalized.length === 8 ? findInvite(normalized) : null
  const lookup = normalized.length < 8 ? '' : !invite ? 'missing' : invite.status !== 'pending' ? 'used' : 'ok'
  return <form className="account-form" autoComplete="off" onSubmit={(event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setError(onSubmit({ code: normalized, name: String(data.get('name') || ''), email: String(data.get('email') || ''), phone: String(data.get('phone') || ''), relationship: String(data.get('relationship') || '') }) || '')
  }}>
    <label className="text-field">Invite code<input name="code" value={code} onChange={(event) => setCode(formatInviteCode(event.target.value).slice(0, 9))} placeholder="XXXX-XXXX" required autoCapitalize="characters" spellCheck="false" inputMode="text" className="code-input" /></label>
    {lookup === 'ok' && <p className="field-hint invite-found" role="status">Invite found{invite.ownerName ? ` from ${invite.ownerName}` : ''}. You were added as {invite.memberName}.</p>}
    {lookup === 'missing' && <p className="field-hint invite-missing" role="status">No invite with this code on this device. This demo keeps plans in the browser, so an invite only works on the device that created it.</p>}
    {lookup === 'used' && <p className="field-hint invite-missing" role="status">This invite has already been used. Choose Sign in to open the plan.</p>}
    <label className="text-field">Your first name<input name="name" required maxLength={50} placeholder="e.g. Daniel" defaultValue={invite?.memberName || ''} key={`name-${invite?.memberName || ''}`} /></label>
    <label className="text-field">Demo email<input name="email" type="email" required placeholder="daniel@example.com" autoComplete="off" defaultValue={invite?.email || ''} key={`email-${invite?.email || ''}`} /></label>
    <label className="text-field">Phone<span className="optional">So the nursing home can reach you</span><input name="phone" type="tel" inputMode="tel" maxLength={30} placeholder="(615) 555-0142" autoComplete="off" /></label>
    <RelationshipSelect key={`rel-${invite?.relationship || ''}`} defaultValue={invite?.relationship || ''} label="Your relationship to the resident" />
    <label className="text-field">Demo password<input name="password" type="password" placeholder="Use any made-up password" required autoComplete="new-password" minLength={4} /></label>
    <p className="field-hint">Passwords are not checked, saved, or sent anywhere. This is a simulated account. Use made-up contact details.</p>
    {error && <p className="account-error" role="alert">{error}</p>}
    <button className="button primary full" type="submit">Join the plan<Icon name="arrow" size={17} /></button>
  </form>
}
