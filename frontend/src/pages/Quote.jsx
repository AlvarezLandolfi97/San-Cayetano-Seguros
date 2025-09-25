import React, { useState } from 'react'
import { api } from '../api'
import UploadField from '../components/UploadField'

export default function Quote(){
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ vtype:'AUTO' })
  const [plans, setPlans] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)

  function onChange(e){ setForm({...form, [e.target.name]: e.target.value}) }

  async function simulate(e){
    e.preventDefault()
    const { data } = await api.post('/quotes/', {
      vtype: form.vtype,
      year: Number(form.year),
      brand: form.brand || '',
      model: form.model || ''
    })
    setPlans(data.plans)
    setStep(2)
  }

  async function sendInspection(e){
    e.preventDefault()
    if(!selectedProduct){ return alert('Elegí un plan para continuar') }
    const fd = new FormData()
    const fields = ['dni','email','phone','birth_date','license_plate','vtype','brand','model','year']
    fields.forEach(k=> fd.append(k, form[k]))
    fd.append('selected_product', selectedProduct)
    fd.append('front', form.front)
    fd.append('back', form.back)
    fd.append('left', form.left)
    fd.append('right', form.right)
    await api.post('/inspections/', fd, { headers:{'Content-Type':'multipart/form-data'} })
    alert('Solicitud enviada. Quedó pendiente de validación. Te avisaremos para pagar.')
  }

  return (
    <div style={{padding:24, maxWidth:760, margin:'0 auto'}}>
      <h2>Cotizar</h2>
      {step===1 && (
        <form onSubmit={simulate} style={{background:'#fff', padding:16, borderRadius:12}}>
          <div style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12}}>
            <label>Tipo
              <select name="vtype" value={form.vtype} onChange={onChange}>
                <option value="AUTO">Auto</option>
                <option value="MOTO">Moto</option>
                <option value="COM">Comercial</option>
              </select>
            </label>
            <label>Patente<input name="license_plate" onChange={onChange} required placeholder="AA123BB" /></label>
            <label>Marca<input name="brand" onChange={onChange} required /></label>
            <label>Modelo<input name="model" onChange={onChange} required /></label>
            <label>Año<input type="number" name="year" onChange={onChange} required /></label>
            <label>DNI<input name="dni" onChange={onChange} required /></label>
            <label>Email<input type="email" name="email" onChange={onChange} required /></label>
            <label>Celular<input name="phone" onChange={onChange} required /></label>
            <label>Fecha de nacimiento<input type="date" name="birth_date" onChange={onChange} required /></label>
          </div>
          <button style={{marginTop:12, background:'#0D47A1', color:'#fff', padding:'8px 12px', borderRadius:8}}>Ver planes</button>
        </form>
      )}

      {step===2 && (
        <div style={{background:'#fff', padding:16, borderRadius:12}}>
          <h3>Planes compatibles</h3>
          <ul style={{listStyle:'none', padding:0}}>
            {plans.map(p=> (
              <li key={p.id} style={{border:'1px solid #eee', borderRadius:8, padding:12, marginBottom:8}}>
                <label style={{display:'flex', gap:12, alignItems:'center'}}>
                  <input type="radio" name="plan" value={p.id} onChange={()=> setSelectedProduct(p.id)} />
                  <div>
                    <div style={{fontWeight:600}}>{p.name}</div>
                    <div style={{fontSize:12, opacity:.7}}>Franquicia: {p.franchise || '-'}</div>
                    <div style={{marginTop:4}}>Precio estimado: ${p.estimated_price}</div>
                  </div>
                </label>
              </li>
            ))}
          </ul>
          <p>Subí las 4 fotos del vehículo (sin filtros, buena luz):</p>
          <form onSubmit={sendInspection}>
            <UploadField label="Frente" name="front" onChange={e=> setForm({...form, front:e.target.files[0]})} />
            <UploadField label="Trasera" name="back" onChange={e=> setForm({...form, back:e.target.files[0]})} />
            <UploadField label="Lateral Izquierdo" name="left" onChange={e=> setForm({...form, left:e.target.files[0]})} />
            <UploadField label="Lateral Derecho" name="right" onChange={e=> setForm({...form, right:e.target.files[0]})} />
            <button style={{marginTop:12, background:'#0D47A1', color:'#fff', padding:'8px 12px', borderRadius:8}}>Enviar para validación</button>
          </form>
        </div>
      )}
    </div>
  )
}
