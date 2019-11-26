




        fulfill(response);
        reject();
       return cache.match("offline.html");
       return matching;
      console.log(response.url + " was cached");
      if(response.status !== 404) {
      return cache.put(request, response);
      }
      } else {
     if(!matching || matching.status == 404) {
     }
     } else {
    console.log("caching index and important routes");
    fetch(request).then(function(response){
    return cache.addAll(["/images/", "/avatar.png", "/codenames.js", "/codenames.manifest", "/codenames_common.css", "/codenames_landscape.css", "/codenames_portrait.css", "/index.html", "/jquery.js", "/jquery-ui.js", "/jquery-ui.min.css", "/offline.html", "/peer.min.js", "/sw.js", "/textalign.bmp" ]);
    return cache.match(request).then(function (matching) {
    return fetch(request).then(function (response) {
    return returnFromCache(event.request);
    });
    });
    }, reject);
  console.log("Installing web app");
  event.respondWith(checkResponse(event.request).catch(function() {
  event.waitUntil(addToCache(event.request));
  event.waitUntil(preLoad());
  return caches.open("offline").then(function (cache) {
  return caches.open("offline").then(function (cache) {
  return caches.open("offline").then(function(cache) {
  return new Promise(function(fulfill, reject) {
  }));
  });
  });
  });
  });
self.addEventListener("fetch", function(event) {
self.addEventListener("install", function(event) {
var addToCache = function(request){
var checkResponse = function(request){
var preLoad = function(){
var returnFromCache = function(request){
});
});
};
};
};
};