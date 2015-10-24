/*
Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

importScripts('bower_components/platinum-sw/service-worker.js');
importScripts('scripts/prolog.js');

//console.log("sw import.js: ",self);

/* global self
*/

self.onmessage = function(msg) {
    console.log("Service Worker: ",msg);
};



function sendmsg(msg) {

    self.clients.matchAll().then(function(clients) {
      clients.forEach(function(client) {
        console.log(client);
        client.postMessage(msg);
      });
    });
    
};