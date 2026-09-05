const CACHE_NAME = "nknews-pwa-v2";

const APP_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg"
];


/* =========================================
   설치
========================================= */

self.addEventListener(
  "install",
  function (event) {

    event.waitUntil(

      caches
        .open(CACHE_NAME)
        .then(function (cache) {

          return cache.addAll(
            APP_FILES
          );

        })

    );

    self.skipWaiting();
  }
);


/* =========================================
   활성화
========================================= */

self.addEventListener(
  "activate",
  function (event) {

    event.waitUntil(

      caches
        .keys()
        .then(function (keys) {

          return Promise.all(

            keys.map(function (key) {

              if (
                key !== CACHE_NAME
              ) {

                return caches.delete(
                  key
                );

              }

            })

          );

        })

    );

    self.clients.claim();
  }
);


/* =========================================
   요청 처리
========================================= */

self.addEventListener(
  "fetch",
  function (event) {

    const request =
      event.request;


    /*
       GET 이외의 요청은
       Service Worker가 건드리지 않음
    */

    if (
      request.method !== "GET"
    ) {
      return;
    }


    const url =
      new URL(
        request.url
      );


    /*
       외부 API / RSS 요청은
       Service Worker 캐시를 사용하지 않음.

       중요:
       RSS2JSON
       AllOrigins
       Google News
       등은 항상 네트워크로 요청.
    */

    if (
      url.origin !== location.origin
    ) {

      event.respondWith(
        fetch(request)
      );

      return;
    }


    /*
       내 사이트 파일은
       네트워크 우선.

       최신 app.js가 있으면
       최신 파일을 사용하고,
       네트워크가 안 되면
       캐시를 사용.
    */

    event.respondWith(

      fetch(request)
        .then(function (response) {

          if (
            response &&
            response.ok
          ) {

            const copy =
              response.clone();

            caches
              .open(CACHE_NAME)
              .then(function (cache) {

                cache.put(
                  request,
                  copy
                );

              });

          }

          return response;

        })
        .catch(function () {

          return caches.match(
            request
          );

        })

    );
  }
);
