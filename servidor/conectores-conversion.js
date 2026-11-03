// Conversión conservadora: si hay un tipo que NEXO no puede representar,
// se rechaza la importación antes de crear una copia incompleta.
const bloque=(tipo,texto,i,extra={})=>({id:`externo-${i+1}`,tipo,texto:String(texto||'').slice(0,9000),...extra});
const valido=x=>Array.isArray(x)&&x.length>0&&x.length<=500&&x.every(b=>b.texto.length<=9000);
function tituloNotion(p){
  const v=Object.values(p.properties||{}).find(x=>x?.type==='title');
  return v?.title?.map(x=>x.plain_text||x.text?.content||'').join('')||'Página de Notion';
}
function textoRico(v){return (v||[]).map(x=>x.plain_text||x.text?.content||'').join('');}
export function convertirDocs(d){
  const secciones=[...(d.body?.content||[])];
  function tabs(t){for(const x of t||[]){secciones.push(...(x.documentTab?.body?.content||[]));tabs(x.childTabs);}}
  tabs(d.tabs);
  if(!secciones.length)throw new Error('El documento no contiene bloques legibles.');
  const bloques=[];
  for(const s of secciones){
    if(s.sectionBreak)continue;
    if(!s.paragraph)throw new Error('El documento contiene tablas, imágenes u objetos que esta importación aún no representa.');
    if(s.paragraph.elements?.some(x=>!x.textRun))throw new Error('El documento contiene elementos de texto no compatibles.');
    const texto=(s.paragraph.elements||[]).map(x=>x.textRun?.content||'').join('').trim();
    if(!texto)continue;
    const estilo=s.paragraph.paragraphStyle?.namedStyleType||'';
    bloques.push(bloque(/^HEADING_|^TITLE$/.test(estilo)?'titulo':s.paragraph.bullet?'lista':'texto',texto,bloques.length));
  }
  if(!valido(bloques))throw new Error('El documento es demasiado grande o está vacío para importarlo.');
  return {tipo:'documento',titulo:String(d.title||'Documento de Google').slice(0,200),bloques};
}
export function convertirForms(f){
  const bloques=[];
  for(const item of f.items||[]){
    if(item.textItem||item.pageBreakItem){bloques.push(bloque(item.pageBreakItem?'titulo':'texto',item.title||item.description||'',bloques.length));continue;}
    const q=item.questionItem?.question;
    if(!q)throw new Error('El formulario contiene un elemento que NEXO no puede representar aún.');
    let respuesta='texto',opciones=[];
    if(q.choiceQuestion){respuesta=q.choiceQuestion.type==='CHECKBOX'?'multiple':'seleccion';opciones=(q.choiceQuestion.options||[]).map(x=>x.value).filter(Boolean);
      if(!['CHECKBOX','RADIO','DROP_DOWN'].includes(q.choiceQuestion.type)||!opciones.length||opciones.length>100)throw new Error('El formulario tiene opciones no compatibles.');}
    else if(q.dateQuestion)respuesta='fecha';
    else if(q.textQuestion)respuesta='texto';
    else throw new Error('El formulario contiene una pregunta que NEXO no puede representar aún.');
    bloques.push(bloque('pregunta',item.title||'Pregunta',bloques.length,{respuesta,opciones,obligatoria:!!q.required}));
  }
  if(!valido(bloques))throw new Error('El formulario es demasiado grande o está vacío para importarlo.');
  return {tipo:'formulario',titulo:String(f.info?.title||f.info?.documentTitle||'Formulario de Google').slice(0,200),bloques};
}
export function convertirNotion(p,items){
  const bloques=[];
  for(const item of items){
    if(item.has_children)throw new Error('La página incluye bloques anidados; todavía no se importan sin pérdida.');
    const tipo=item.type,valor=item[tipo],texto=textoRico(valor?.rich_text);
    const nexo=/^heading_[123]$/.test(tipo)?'titulo':tipo==='bulleted_list_item'||tipo==='numbered_list_item'?'lista':tipo==='paragraph'?'texto':null;
    if(!nexo)throw new Error(`La página incluye el bloque ${tipo}, que NEXO aún no representa.`);
    if(texto.trim())bloques.push(bloque(nexo,texto,bloques.length));
  }
  if(!valido(bloques))throw new Error('La página está vacía o es demasiado grande para importarla.');
  return {tipo:'documento',titulo:String(tituloNotion(p)).slice(0,200),bloques};
}
