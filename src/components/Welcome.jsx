import './Welcome.css'

function BridgeMark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <path d="M4 24V13M32 24V13M4 18C11 18 10 8 18 8S25 18 32 18M4 24H32M10 24V16M18 24V9M26 24V16" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 29H33" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  )
}

function Arrow({ diagonal = false }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h15m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function Landscape() {
  return (
    <svg className="welcome-landscape" viewBox="0 0 640 590" fill="none" aria-hidden="true">
      <defs>
        <clipPath id="w-scene-clip"><path d="M32 270C32 132 142 31 306 31c170 0 302 111 302 272v224H32V270Z" /></clipPath>
        <linearGradient id="w-sky" x1="320" y1="31" x2="320" y2="527" gradientUnits="userSpaceOnUse"><stop stopColor="#eeede3" /><stop offset="1" stopColor="#f8f5e9" /></linearGradient>
        <linearGradient id="w-river" x1="311" y1="318" x2="370" y2="560" gradientUnits="userSpaceOnUse"><stop stopColor="#a8c8ba" /><stop offset="1" stopColor="#c3d4c2" /></linearGradient>
      </defs>
      <g clipPath="url(#w-scene-clip)">
        <path fill="url(#w-sky)" d="M0 0h640v590H0z" />
        <circle cx="444" cy="133" r="58" fill="#e4b695" />
        <path d="M400 106c11-7 17-8 28-4m35-18c9-6 15-5 23-2" stroke="#c89575" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M-12 315c103-58 150-49 228-3 72 42 114-1 182-12 94-16 173 12 256 61v213H-12V315Z" fill="#c8d2ba" />
        <path d="M-20 383c107-99 225-25 337-33 116-9 176-68 337-40v280H-20V383Z" fill="#b3c4a7" />
        <path d="M358 327c-16 38-67 46-66 86 1 43 91 57 113 87 14 19 9 39-5 60H261c33-23 47-37 25-58-28-27-69-49-63-82 8-44 93-60 103-93h32Z" fill="url(#w-river)" />
        <path d="M289 418c-5 22 28 38 51 51m-39-68c7-8 20-15 31-22m25 115c17 12 23 22 17 34" stroke="#e0e7d5" strokeWidth="2" strokeLinecap="round" />

        {/* A familiar home, and a welcoming place on the other side. */}
        <path d="m75 264 66-52 66 52v92H75v-92Z" fill="#e9d6b4" />
        <path d="m60 267 81-65 80 65" stroke="#8a7461" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M171 221v-29h17v43" fill="#8a7461" />
        <path d="M129 356v-50a13 13 0 0 1 26 0v50" fill="#627c65" />
        <path d="M93 278h21v28H93zm76 0h21v28h-21z" fill="#f9f4e5" />
        <path d="M103.5 278v28m-10.5-14h21m65.5-14v28m-10.5-14h21" stroke="#b8a68b" strokeWidth="2" />
        <path d="M62 357h153" stroke="#a2b291" strokeWidth="5" strokeLinecap="round" />
        <path d="M117 364c-18 9-22 23-20 34" stroke="#d8d4b9" strokeWidth="13" strokeLinecap="round" />

        <path d="M433 221h101a8 8 0 0 1 8 8v125H425V229a8 8 0 0 1 8-8Z" fill="#f4ecda" />
        <path d="M414 225h137" stroke="#67816b" strokeWidth="8" strokeLinecap="round" />
        <path d="M443 221v-13a40 40 0 0 1 80 0v13" fill="#e6d5b3" />
        <path d="M469 354v-53a15 15 0 0 1 30 0v53" fill="#6c8c76" />
        <path d="M440 247h18v23h-18zm70 0h18v23h-18zm-70 45h18v23h-18zm70 0h18v23h-18z" fill="#d2dcce" />
        <path d="M483 181v20m-10-10h20" stroke="#9c9274" strokeWidth="2" strokeLinecap="round" />
        <path d="M420 356h126" stroke="#91a789" strokeWidth="5" strokeLinecap="round" />
        <path d="M490 361c-10 16-34 26-59 27" stroke="#ded9bb" strokeWidth="14" strokeLinecap="round" />

        {/* The bridge is intentionally the visual center of the story. */}
        <path d="M191 383c52-69 142-86 220-17l-1 38c-76-68-149-57-220 20l1-41Z" fill="#e8d7b5" />
        <path d="M189 384c67-75 151-82 223-18" stroke="#8a9e7f" strokeWidth="8" strokeLinecap="round" />
        <path d="M192 355c67-72 148-79 219-17" stroke="#617b64" strokeWidth="5" strokeLinecap="round" />
        <path d="M194 354v29m28-54v28m29-45v29m30-38v30m31-31v31m31-23v31m31-11v30m30-8v29" stroke="#617b64" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M207 391c55-47 124-53 188-8" stroke="#f5e9ce" strokeWidth="3" strokeLinecap="round" />

        {/* Two people taking the next step together. */}
        <ellipse cx="284" cy="326" rx="16" ry="5" fill="#8ba182" opacity=".3" />
        <path d="m277 299-3 27m14-27 3 26" stroke="#4c6150" strokeWidth="6" strokeLinecap="round" />
        <path d="M271 277c0-9 6-14 12-14s12 5 12 14l-3 28h-18l-3-28Z" fill="#bc8064" />
        <circle cx="282" cy="253" r="10" fill="#d8b08b" />
        <path d="M273 250c0-11 19-13 20 1-7-1-10-7-20-1Z" fill="#ddd9c9" />
        <path d="m273 279-9 18m29-18 9 14" stroke="#bc8064" strokeWidth="6" strokeLinecap="round" />
        <path d="m312 300-1 27m13-26 8 27" stroke="#4c6150" strokeWidth="6" strokeLinecap="round" />
        <path d="M305 276c0-9 5-14 12-14s13 5 13 14l-2 30h-22l-1-30Z" fill="#789680" />
        <circle cx="317" cy="251" r="10" fill="#d5a17b" />
        <path d="M307 252c-5-20 24-20 21 2-3-5-8-7-12-10-2 5-5 7-9 8Z" fill="#5f6551" />
        <path d="m307 279-5 14m26-14 7 17" stroke="#789680" strokeWidth="6" strokeLinecap="round" />
        <path d="m265 298-3 30" stroke="#7e6e55" strokeWidth="2.5" strokeLinecap="round" />

        {/* Garden silhouettes keep the scene calm and gently imperfect. */}
        <path d="M46 370V271m1 40c-25-7-29-28-25-40 22 0 31 23 25 40Zm0 23c25-7 34-29 26-43-21 5-30 23-26 43Z" fill="#8ca180" />
        <path d="M563 365V253m0 37c-30-8-35-35-29-49 27 1 39 26 29 49Zm0 32c32-9 41-33 32-51-27 4-37 29-32 51Z" fill="#7f9879" />
        <path d="M547 375c-2-19 4-34 16-43 12 8 19 25 16 43" fill="#a2b494" />
        <path d="M102 455c46-7 76-6 103 4m252-26c22-5 44-4 62 1" stroke="#9eb48f" strokeWidth="3" strokeLinecap="round" />
        <path d="M70 432c13-26 31-24 38-5 13-31 39-21 42 5H70Zm388-48c6-18 25-21 31-3 13-23 31-14 33 4h-64Z" fill="#8fa882" />
        <path d="M182 459v-16m-7 5 7 6 8-10m343-33v-17m-7 6 7 7 8-12" stroke="#617e64" strokeWidth="2" strokeLinecap="round" />
        <circle cx="182" cy="440" r="4" fill="#e2b491" /><circle cx="534" cy="391" r="4" fill="#e2b491" />
        <path d="M-1 509c109-40 188-18 270 6 135 38 236-50 381-14v99H-1v-91Z" fill="#d7d9bd" />
      </g>
      <path d="M32 270C32 132 142 31 306 31c170 0 302 111 302 272" stroke="#d5d9c6" strokeWidth="1" />
      <path d="m577 91 8-14m-19 9-7-11m30 23 14-3" stroke="#acb99b" strokeWidth="2" strokeLinecap="round" />
      <path d="m46 158 5-8 5 8-5 8-5-8Z" fill="#c5cbb2" />
    </svg>
  )
}

const steps = [
  { number: '01', title: 'Describe the care needed', detail: 'Record daily support needs and questions for the care team.' },
  { number: '02', title: 'Compare nursing homes', detail: 'Review facility details and save homes to discuss with your family.' },
  { number: '03', title: 'Prepare for move-in', detail: 'Assign tasks and prepare a profile of the person moving into care.' },
]

export default function Welcome({ onStart, onSignIn }) {
  return (
    <div className="welcome-page">
      <a className="welcome-skip" href="#welcome-main">Skip to content</a>
      <header className="welcome-header">
        <div className="welcome-brand" aria-label="Carebridge"><BridgeMark className="welcome-brand-mark" /><span>carebridge<span className="welcome-brand-dot">.</span></span></div>
        <div className="welcome-header-actions"><button type="button" className="welcome-signin" onClick={onSignIn}>Sign in <Arrow diagonal /></button></div>
      </header>

      <main id="welcome-main" className="welcome-main" tabIndex={-1}>
        <section className="welcome-hero" aria-labelledby="welcome-title">
          <div className="welcome-copy">
            <h1 id="welcome-title">Plan a move to a<br /><em>nursing home.</em></h1>
            <p className="welcome-description">When a family member needs nursing home care, there’s a lot to work out. Carebridge helps you compare homes and keep track of what needs to happen before move-in.</p>
            <div className="welcome-buttons">
              <button type="button" className="welcome-start" onClick={onStart}>Create a transition plan <Arrow /></button>
            </div>
          </div>

          <div className="welcome-art">
            <Landscape />
            <div className="welcome-plan-peek">
              <div className="welcome-peek-heading"><span className="welcome-peek-icon"><BridgeMark /></span><span className="welcome-peek-name">Arthur’s move-in plan</span><span className="welcome-peek-badge">Sample plan</span></div>
              <div className="welcome-peek-task"><span className="welcome-peek-check">✓</span><span>Discuss Arthur’s care needs</span></div>
              <div className="welcome-peek-task"><span className="welcome-peek-check">✓</span><span>Compare homes near family</span></div>
              <div className="welcome-peek-task"><span className="welcome-peek-pending" /><span>Pack photos and familiar items</span><span className="welcome-peek-heart" aria-hidden="true">♡</span></div>
            </div>
          </div>
        </section>

        <section className="welcome-journey" aria-label="How Carebridge helps">
          <div className="welcome-journey-intro"><h2>What goes into your plan</h2></div>
          <div className="welcome-step-grid">{steps.map((step) => <div className="welcome-step" key={step.number}><span className="welcome-step-number">{step.number}</span><h3>{step.title}</h3><p>{step.detail}</p></div>)}</div>
        </section>
      </main>

      <footer className="welcome-footer"><span>Your family chooses the home and reviews the plan.</span></footer>
    </div>
  )
}
