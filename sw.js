var CACHE='roleta-adam-v1';
var FILES=['/index.html','/manifest.json'];

self.addEventListener('install',function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(cache){return cache.addAll(FILES);})
  );
});

self.addEventListener('fetch',function(e){
  e.respondWith(
    caches.match(e.request).then(function(r){return r||fetch(e.request);})
  );
});

self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
    })
  );
});
