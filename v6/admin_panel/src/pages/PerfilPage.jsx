import { useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function PerfilPage(){
  const { user } = useAuth();
  const [form,setForm]=useState({actual:'',nueva:'',confirmar:''});
  const [msg,setMsg]=useState(''); const [err,setErr]=useState('');
  function update(k,v){setForm((p)=>({...p,[k]:v}));}
  async function submit(e){e.preventDefault(); setMsg(''); setErr(''); if(form.nueva!==form.confirmar){setErr('Las contrasenas no coinciden'); return;} try{ await apiFetch('/auth/cambiar-password',{method:'POST', body:JSON.stringify({actual:form.actual,nueva:form.nueva})}); setMsg('Contrasena actualizada.'); setForm({actual:'',nueva:'',confirmar:''}); }catch(error){setErr(error.message||'No se pudo cambiar');}}
  return <div className="grid gap-6"><section><h2 className="text-2xl font-bold">Mi perfil</h2><p className="text-sm text-gray-500">{user?.nombre} Â· {user?.email} Â· {user?.role}</p></section>{msg?<div className="card p-4 text-green-700">{msg}</div>:null}{err?<div className="card p-4 text-red-600">{err}</div>:null}<form onSubmit={submit} className="card grid max-w-xl gap-4 p-5"><h3 className="text-lg font-semibold">Cambiar contrasena</h3><Field label="Contrasena actual"><input className="input" type="password" value={form.actual} onChange={(e)=>update('actual',e.target.value)} required /></Field><Field label="Nueva contrasena"><input className="input" type="password" value={form.nueva} onChange={(e)=>update('nueva',e.target.value)} required /></Field><Field label="Confirmar nueva contrasena"><input className="input" type="password" value={form.confirmar} onChange={(e)=>update('confirmar',e.target.value)} required /></Field><button className="btn btn-primary">Actualizar contrasena</button></form></div>;
}
function Field({label,children}){return <label className="grid gap-1"><span className="text-sm font-medium">{label}</span>{children}</label>;}