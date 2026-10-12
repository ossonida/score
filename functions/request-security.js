export function bearerToken(header){const match=typeof header==='string'&&header.length<=4096?header.match(/^Bearer ([A-Za-z0-9_.-]+)$/):null;return match?.[1]||null;}
export async function boundedXml(response,maxBytes=2_000_000){
 if(Number(response.headers.get('content-length'))>maxBytes)throw Error('Response too large');
 if(!response.body)throw Error('Empty response');
 const reader=response.body.getReader(),chunks=[];let bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>maxBytes)throw Error('Response too large');chunks.push(value);}}finally{await reader.cancel();}
 const data=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}
 const xml=new TextDecoder('utf-8',{fatal:true}).decode(data);if(/<!\s*(DOCTYPE|ENTITY)\b/i.test(xml))throw Error('XML declarations are not allowed');return xml;
}
export function rateWindow(previous,now,limit=30){const start=Number(previous?.start)||0;const fresh=now-start>=60000||now<start;const count=fresh?0:Number(previous?.count)||0;if(count>=limit)return null;return {start:fresh?now:start,count:count+1};}
