var SHARE_CACHE='mymemo-share-v1';
function shareKey(){try{return new URL('__mymemo_shared__',self.registration.scope).href;}catch(e){return '__mymemo_shared__';}}
function fv(fd,n){var v=fd.get(n);return typeof v==='string'?v:'';}
self.addEventListener('install',function(e){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(clients.claim())});
self.addEventListener('fetch',function(e){
if(e.request.method==='POST'){
var u;try{u=new URL(e.request.url);}catch(err){return;}
var scopePath='/';try{scopePath=new URL(self.registration.scope).pathname;}catch(err){}
if(u.origin!==self.location.origin||u.pathname.indexOf(scopePath)!==0)return;
e.respondWith((async function(){
try{
var fd=await e.request.formData();
var data={title:fv(fd,'title'),text:fv(fd,'text'),url:fv(fd,'url')};
var cache=await caches.open(SHARE_CACHE);
await cache.put(shareKey(),new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}}));
}catch(err){}
return Response.redirect(new URL('?sharepost=1',self.registration.scope).href,303);
})());
return;}
e.respondWith(fetch(e.request).catch(function(){return caches.match(e.request)}));
});