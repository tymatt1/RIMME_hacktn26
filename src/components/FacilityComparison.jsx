import { comparisonRows } from '../lib/facility-comparison.js'
import Icon from './Icon.jsx'
import ComparisonValue from './ComparisonValue.jsx'

export default function FacilityComparison({ homes, onDetails, onDownload, exporting }) {
  return <>
    <div className="comparison-tools"><p>{homes.length} saved homes. Scroll sideways to see more.</p><button className="button secondary" disabled={exporting || homes.length < 2} onClick={onDownload}><Icon name="download" size={17} />{exporting ? 'Creating PDF...' : 'Download comparison (PDF)'}</button></div>
    <div className="comparison-scroll" role="region" tabIndex={0} aria-label="Saved nursing homes, side-by-side comparison. Scroll horizontally for more homes.">
      <table className="comparison-table">
        <caption className="sr-only">Key facts for saved nursing homes</caption>
        <thead><tr><th scope="col">Compare homes</th>{homes.map((home) => <th scope="col" key={home.id}><h3>{home.name}</h3><button className="text-button" onClick={() => onDetails(home.id)}>View full details <Icon name="arrow" size={15} /></button></th>)}</tr></thead>
        <tbody>{comparisonRows.map(([id, label, get]) => <tr key={id}><th scope="row">{label}</th>{homes.map((home) => <td key={home.id}><ComparisonValue id={id} home={home} fallback={get(home)} /></td>)}</tr>)}</tbody>
      </table>
    </div>
    <p className="comparison-note">Match scores summarize CMS data and recorded priorities, not admission eligibility. Confirm current information with each home. Fictional samples are labeled.</p>
  </>
}
