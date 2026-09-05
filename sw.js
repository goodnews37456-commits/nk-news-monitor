const CACHE_NAME = "nknews-pwa-v3";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg"
];


/* 설치 */

self.addEventListener(
  "install",
  function (event) {

    event.waitUntil(

      caches
        .open(CACHE_NAME)
        .then(function (cache) {

          return cache.addAll(ASSETS);

        })

    );

    self.skipWaiting();

  }
);


/* 활성화 */

self.addEventListener(
  "activate",
  function (event) {

    event.waitUntil(

      caches
        .keys()
        .then(function (keys) {

          return Promise.all(

            keys
              .filter(function (key) {

                return key !== CACHE_NAME;

              })

              .map(function (key) {

                return caches.delete(key);

              })

          );

        })

    );

    self.clients.claim();

  }
);


/* 요청 처리 */

self.addEventListener(
  "fetch",
  function (event) {

    /*
       뉴스 API / 외부 데이터는
       Service Worker 캐시를 사용하지 않음
    */

    if (
      event.request.url.includes(
        "rss2json.com"
      ) ||
      event.request.url.includes(
        "allorigins.win"
      ) ||
      event.request.url.includes(
        "news.google.com"
      )
    ) {

      event.respondWith(
        fetch(event.request)
      );

      return;

    }


    /*
       앱 파일은 캐시 우선
       없으면 네트워크
    */

    event.respondWith(

      caches
        .match(event.request)
        .then(function (cached) {

          if (cached) {
            return cached;
          }


          return fetch(event.request)
            .then(function (response) {

              return response;

            });

        })

    );

  }
);
