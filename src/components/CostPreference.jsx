const currency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

export default function CostPreference({ value, onChange }) {
  return <div className="cost-preference">
    <div className="cost-value"><label htmlFor="monthly-budget">Monthly out-of-pocket budget</label><output htmlFor="monthly-budget">{value === null ? 'Not sure yet' : currency(value)}</output></div>
    <input id="monthly-budget" type="range" min="0" max="20000" step="500" value={value ?? 5000} aria-valuetext={value === null ? 'Not set. Adjust to choose a monthly budget.' : `${currency(value)} per month`} onChange={(event) => onChange(Number(event.target.value))} />
    <div className="range-labels"><span>$0 / month</span><span>$20,000 / month</span></div>
    <label className="budget-unsure"><input type="checkbox" checked={value === null} onChange={(event) => onChange(event.target.checked ? null : 5000)} />Not sure yet</label>
  </div>
}
