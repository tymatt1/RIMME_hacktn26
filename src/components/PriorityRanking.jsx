import { useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { completePriorityOrder, movePriority } from '../lib/priorities.js'

export default function PriorityRanking({ value, onChange }) {
  const order = completePriorityOrder(value)
  const listRef = useRef(null)
  const dragRef = useRef(null)
  const [dragged, setDragged] = useState(null)
  const [target, setTarget] = useState(null)
  const [announcement, setAnnouncement] = useState('')

  function move(topic, destination) {
    const next = movePriority(order, topic, destination)
    onChange(next)
    setAnnouncement(`${topic} is now priority ${next.indexOf(topic) + 1} of ${next.length}.`)
  }

  function resetDrag() {
    dragRef.current = null
    setDragged(null)
    setTarget(null)
  }

  function pointerDown(event, topic) {
    if (!event.isPrimary || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.focus()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { type: 'pointer', topic, target: topic, x: event.clientX, y: event.clientY, active: false }
  }

  function pointerMove(event) {
    const drag = dragRef.current
    if (drag?.type !== 'pointer') return
    if (!drag.active && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return
    drag.active = true
    setDragged(drag.topic)
    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-priority]')
    if (row && listRef.current.contains(row)) {
      drag.target = row.dataset.priority
      setTarget(drag.target)
    }
  }

  function pointerUp() {
    const drag = dragRef.current
    if (drag?.active && drag.topic !== drag.target) move(drag.topic, drag.target)
    resetDrag()
  }

  return <div className="priority-ranking">
    <p className="priority-direction">Most important first <span>Drag the blocks or use the arrows.</span></p>
    <ol className="priority-list" aria-label="Family priorities, highest first" ref={listRef}>
      {order.map((topic, index) => <li key={topic} data-priority={topic} className={`priority-block ${dragged === topic ? 'dragging' : ''} ${target === topic && dragged !== topic ? 'drop-target' : ''}`} draggable
        onDragStart={(event) => { dragRef.current = { type: 'native', topic }; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', topic); setDragged(topic) }}
        onDragOver={(event) => { if (dragRef.current?.type !== 'native') return; event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setTarget(topic) }}
        onDrop={(event) => { event.preventDefault(); if (dragRef.current?.type === 'native') move(dragRef.current.topic, topic); resetDrag() }}
        onDragEnd={resetDrag}>
        <button type="button" className="priority-handle" aria-label={`Reorder ${topic}`} aria-describedby="priority-keyboard-help" onPointerDown={(event) => pointerDown(event, topic)} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={resetDrag} onLostPointerCapture={resetDrag} onKeyDown={(event) => {
          if (!['ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape'].includes(event.key)) return
          event.preventDefault()
          if (event.key === 'Escape') { resetDrag(); return }
          const destination = event.key === 'Home' ? 0 : event.key === 'End' ? order.length - 1 : index + (event.key === 'ArrowUp' ? -1 : 1)
          if (destination >= 0 && destination < order.length && destination !== index) {
            const handle = event.currentTarget
            move(topic, order[destination])
            window.requestAnimationFrame(() => handle.focus())
          }
        }}><Icon name="grip" size={20} /></button>
        <span className="priority-number" aria-hidden="true">{index + 1}</span><span className="priority-topic">{topic}</span>
        <div className="priority-actions"><button type="button" className="icon-button" aria-label={`Move ${topic} up`} disabled={index === 0} onClick={() => move(topic, order[index - 1])}><Icon name="up" size={16} /></button><button type="button" className="icon-button" aria-label={`Move ${topic} down`} disabled={index === order.length - 1} onClick={() => move(topic, order[index + 1])}><Icon name="down" size={16} /></button></div>
      </li>)}
    </ol>
    <p id="priority-keyboard-help" className="sr-only">On a reorder handle, use Up or Down to move one position, or Home and End to move to the first or last position.</p>
    <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
  </div>
}
