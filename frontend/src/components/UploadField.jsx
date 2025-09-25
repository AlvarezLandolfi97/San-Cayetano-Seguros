import React from 'react'
export default function UploadField({label, name, onChange}){
  return (
    <label style={{display:'block', marginBottom:12}}>
      <div style={{fontWeight:600, marginBottom:6}}>{label}</div>
      <input type="file" accept="image/*" name={name} onChange={onChange} />
      <div style={{fontSize:12, color:'#555'}}>JPG/PNG, mínimo 1280px, sin filtros.</div>
    </label>
  )
}
