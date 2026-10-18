import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import PriorityInfo from './PriorityInfo.jsx'
import { completePriorityOrder, movePriority } from '../lib/priorities.js'

export default function PriorityRanking({ value, onChange }) {
  const order = completePriorityOrder(value)
  const listRef = useRef(null)
  const dragRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [announcement, setAnnouncement] = useState('')

  function move(topic, destination) {
    const next = movePriority(order, topic, destination)
    onChange(next)
    setAnnouncement(`${topic} is now priority ${next.indexOf(topic) + 1} of ${next.length}.`)
  }

  function cancelDrag() {
    dragRef.current = null
    setPreview(null)
  }

  useEffect(() => {
    const escape = (event) => {
      if (event.key === 'Escape' && dragRef.current) {
        event.preventDefault()
        event.stopImmediatePropagation()
        cancelDrag()
      }
    }
    document.addEventListener('keydown', escape, true)
    return () => document.removeEventListener('keydown', escape, true)
  }, [])

  function pointerDown(event, topic, index) {
    if (!event.isPrimary || event.button !== 0) return
    const button = event.target.closest('button')
    if (button && !button.classList.contains('priority-handle')) return
    event.preventDefault()
    event.currentTarget.querySelector('.priority-handle').focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = event.currentTarget.getBoundingClientRect()
    const scroller = listRef.current.closest('.dialog') || document.scrollingElement
    dragRef.current = { topic, index, target: index, x: event.clientX, y: event.clientY, rect, active: false, scroller, scrollTop: scroller.scrollTop, slots: [...listRef.current.children].map((row) => row.getBoundingClientRect()) }
  }

  function pointerMove(event) {
    const drag = dragRef.current
    if (!drag) return
    if (!drag.active && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5) return
    drag.active = true
    const y = event.clientY + drag.scroller.scrollTop - drag.scrollTop
    drag.target = drag.slots.reduce((closest, rect, index) => Math.abs(y - (rect.top + rect.height / 2)) < Math.abs(y - (drag.slots[closest].top + drag.slots[closest].height / 2)) ? index : closest, 0)
    setPreview({ topic: drag.topic, from: drag.index, to: drag.target, x: drag.rect.left + event.clientX - drag.x, y: drag.rect.top + event.clientY - drag.y, width: drag.rect.width, height: drag.rect.height })
  }

  function pointerUp() {
    const drag = dragRef.current
    if (drag?.active && drag.index !== drag.target) move(drag.topic, order[drag.target])
    cancelDrag()
  }

  function destinationIndex(index) {
    if (!preview) return index
    let destination = index
    if (index === preview.from) destination = preview.to
    else if (preview.from < preview.to && index > preview.from && index <= preview.to) destination--
    else if (preview.from > preview.to && index >= preview.to && index < preview.from) destination++
    return destination
  }

  function rowStyle(index) {
    if (!preview) return undefined
    const slots = dragRef.current.slots
    return { transform: `translateY(${slots[destinationIndex(index)].top - slots[index].top}px)` }
  }

  return <div className={`priority-ranking ${preview ? 'drag-active' : ''}`}>
    <p className="priority-direction">Most important first <span>Drag a block or use the arrows.</span></p>
    <ol className="priority-list" aria-label="Family priorities, highest first" ref={listRef}>
      {order.map((topic, index) => <li key={topic} data-priority={topic} className={`priority-block ${preview?.topic === topic ? 'drag-placeholder' : ''}`} style={rowStyle(index)} onPointerDown={(event) => pointerDown(event, topic, index)} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={cancelDrag} onLostPointerCapture={cancelDrag}>
        <button type="button" className="priority-handle" aria-label={`Reorder ${topic}`} aria-describedby="priority-keyboard-help" onKeyDown={(event) => {
          if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
          event.preventDefault()
          const destination = event.key === 'Home' ? 0 : event.key === 'End' ? order.length - 1 : index + (event.key === 'ArrowUp' ? -1 : 1)
          if (destination >= 0 && destination < order.length && destination !== index) {
            const handle = event.currentTarget
            move(topic, order[destination])
            window.requestAnimationFrame(() => handle.focus())
          }
        }}><Icon name="grip" size={20} /></button>
        <span className="priority-number" aria-hidden="true">{destinationIndex(index) + 1}</span><span className="priority-topic">{topic}<PriorityInfo topic={topic} /></span>
        <div className="priority-actions"><button type="button" className="icon-button" aria-label={`Move ${topic} up`} disabled={index === 0} onClick={() => move(topic, order[index - 1])}><Icon name="up" size={16} /></button><button type="button" className="icon-button" aria-label={`Move ${topic} down`} disabled={index === order.length - 1} onClick={() => move(topic, order[index + 1])}><Icon name="down" size={16} /></button></div>
      </li>)}
    </ol>
    {preview && createPortal(<div className="priority-block priority-drag-overlay" aria-hidden="true" style={{ width: preview.width, height: preview.height, transform: `translate3d(${preview.x}px, ${preview.y}px, 0) rotate(-1deg)` }}><span className="priority-handle"><Icon name="grip" size={20} /></span><span className="priority-number">{preview.to + 1}</span><span className="priority-topic">{preview.topic}</span><span className="priority-drag-position">Position {preview.to + 1}</span></div>, document.body)}
    <p id="priority-keyboard-help" className="sr-only">On a reorder handle, use Up or Down to move one position, or Home and End to move to the first or last position. Press Escape while dragging to cancel.</p>
    <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
  </div>
}
