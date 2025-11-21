export default function PolicySelector({ policies, value, onChange }) {
  if (!policies?.length) return null;
  if (policies.length === 1) return null;
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label>Seleccioná tu póliza: </label>
      <select value={value} onChange={(e)=>onChange(e.target.value)}>
        {policies.map(p => (
          <option key={p.id} value={p.id}>
            {p.product} — {p.plate} ({p.status})
          </option>
        ))}
      </select>
    </div>
  );
}
