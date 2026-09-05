const C = "nknews-pwa-v2";

const A = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg"
];

self.addEventListener(
  "install",
  event => {

    event.waitUntil(
      caches
        .open(C)
        .then(cache => cache.addAll(A))
        .then(() => self.skipWaiting())
    );

  }
);


self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      caches
        .keys()
        .then(keys =>
          Promise.all(
            keys
              .filter(key => key !== C)
              .map(key => caches.delete(key))
          )
        )
        .then(() =>
          self.clients.claim()
        )

    );

  }
);


self.addEventListener(
  "fetch",
  event => {

    event.respondWith(

      fetch(event.request)
        .then(response => {

          const copy =
            response.clone();

          caches
            .open(C)
            .then(cache => {

              cache.put(
                event.request,
                copy
              );

            });

          return response;

        })
        .catch(() =>
          caches.match(
            event.request
          )
        )

    );

  }
);
