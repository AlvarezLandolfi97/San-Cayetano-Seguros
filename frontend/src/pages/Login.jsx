import React, { useState } from 'react'
import { api, setAuth } from '../api'
import { saveToken } from '../auth'
import { useNavigate } from 'react-router-dom'

export default function Login(){
  const [dni, setDni] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const nav = useNavigate()

  async function onSubmit(e){
    e.preventDefault()
    try{
      const r = await api.post('/accounts/jwt/create/', {dni, password})
      saveToken(r.data.access)
      setAuth(r.data.access)
      nav('/dashboard')
    }catch(err){ setError('Credenciales inválidas') }
  }

  return (
    <div style={{padding:24, maxWidth:420, margin:'40px auto', background:'#fff', borderRadius:12}}>
      <h2>Iniciar sesión</h2>
      <form onSubmit={onSubmit}>
        <label>DNI<input value={dni} onChange={e=>setDni(e.target.value)} required /></label>
        <label>Contraseña<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>
        {error && <div style={{color:'#C62828'}}>{error}</div>}
        <button style={{marginTop:12, background:'#0D47A1', color:'#fff', padding:'8px 12px', borderRadius:8}}>Entrar</button>
      </form>
    </div>
  )
}
