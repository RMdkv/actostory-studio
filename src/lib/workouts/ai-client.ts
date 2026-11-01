export async function consumeWorkoutAI(response:Response,onEvent:(event:Record<string,unknown>)=>void){
 if(!response.ok){const body=await response.json().catch(()=>({error:"Não foi possível acessar a IA."}));throw new Error(body.error||"Não foi possível acessar a IA.");}
 const reader=response.body?.getReader();if(!reader)throw new Error("Resposta vazia da IA.");const decoder=new TextDecoder();let buffer="";
 while(true){const {done,value}=await reader.read();buffer+=decoder.decode(value,{stream:!done});const lines=buffer.split("\n");buffer=lines.pop()||"";for(const line of lines){if(!line.trim())continue;const event=JSON.parse(line);if(event.error)throw new Error(event.error);onEvent(event);}if(done)break;}
 if(buffer.trim()){const event=JSON.parse(buffer);if(event.error)throw new Error(event.error);onEvent(event);}
}