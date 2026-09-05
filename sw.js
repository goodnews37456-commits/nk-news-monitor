/* =========================================================
   북한 NEWS Monitor PWA
   sw.js
   안정화 + 캐시 문제 해결 버전
   ========================================================= */

const CACHE_NAME = "nk-news-monitor-v3";

/*
   GitHub Pages 루트에 있는 실제 파일만 캐시합니다.
*/
const APP_FILES = [
  "./",
  "./index.html",
  "./app.js",
  "./styles.css",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png"
];


/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener("install", function (event) {

  console.log(
    "[SW] 설치:",
    CACHE_NAME
  );

  /*
     새 Service Worker를 즉시 대기 상태에서
     활성화할 수 있도록 합니다.
  */
  self.skipWaiting();


  event.waitUntil(

    caches.open(CACHE_NAME)

      .then(function (cache) {

        console.log(
          "[SW] 앱 파일 캐시 시작"
        );

        /*
           하나라도 실패했다고 전체 설치가
           실패하지 않도록 개별적으로 처리합니다.
        */
        return Promise.all(

          APP_FILES.map(function (file) {

            return cache.add(file)

              .then(function () {

                console.log(
                  "[SW] 캐시 완료:",
                  file
                );

              })

              .catch(function (error) {

                console.warn(
                  "[SW] 캐시 실패:",
                  file,
                  error
                );

              });

          })

        );

      })

  );

});


/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener("activate", function (event) {

  console.log(
    "[SW] 활성화:",
    CACHE_NAME
  );


  event.waitUntil(

    caches.keys()

      .then(function (cacheNames) {

        return Promise.all(

          cacheNames.map(function (cacheName) {

            /*
               현재 버전 이외의 이전 캐시 삭제
            */
            if (
              cacheName !== CACHE_NAME
            ) {

              console.log(
                "[SW] 이전 캐시 삭제:",
                cacheName
              );

              return caches.delete(
                cacheName
              );

            }

          })

        );

      })

      .then(function () {

        /*
           현재 열린 페이지에도
           새 Service Worker 즉시 적용
        */
        return self.clients.claim();

      })

  );

});


/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener("fetch", function (event) {

  const request =
    event.request;


  /*
     GET 요청만 처리합니다.
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
     다른 사이트의 요청은
     Service Worker가 건드리지 않습니다.

     특히 Google News RSS,
     RSS2JSON,
     AllOrigins 등의 외부 API는
     브라우저가 직접 요청하도록 합니다.
  */
  if (
    url.origin !== self.location.origin
  ) {

    return;

  }


  /*
     HTML 페이지는
     항상 네트워크를 먼저 확인합니다.

     이렇게 해야 GitHub Pages에
     index.html이 업데이트됐을 때
     오래된 화면이 계속 나오는 문제를 줄일 수 있습니다.
  */
  if (
    request.mode === "navigate" ||
    request.destination === "document"
  ) {

    event.respondWith(

      fetch(request)

        .then(function (response) {

          /*
             정상 응답이면 최신 index.html을
             캐시에 저장합니다.
          */
          if (
            response &&
            response.ok
          ) {

            const copy =
              response.clone();

            caches.open(
              CACHE_NAME
            )
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

          /*
             인터넷이 안 되는 경우
             캐시된 index.html 사용
          */
          return caches.match(
            request
          )

          .then(function (cached) {

            if (cached) {

              return cached;

            }

            return caches.match(
              "./index.html"
            );

          });

        })

    );

    return;

  }


  /*
     JS / CSS / manifest / 아이콘 등
     정적 파일 처리

     네트워크 우선:
     최신 파일이 있으면 사용하고
     성공한 파일은 캐시를 갱신합니다.
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

          caches.open(
            CACHE_NAME
          )
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

        /*
           네트워크가 안 될 경우
           기존 캐시 사용
        */
        return caches.match(
          request
        );

      })

  );

});


/* =========================================================
   MESSAGE
   ========================================================= */

self.addEventListener("message", function (event) {

  if (
    !event.data
  ) {

    return;

  }


  /*
     앱에서 강제로 캐시 삭제 요청 가능
  */
  if (
    event.data.type ===
    "CLEAR_CACHE"
  ) {

    event.waitUntil(

      caches.keys()

        .then(function (cacheNames) {

          return Promise.all(

            cacheNames.map(function (cacheName) {

              return caches.delete(
                cacheName
              );

            })

          );

        })

        .then(function () {

          console.log(
            "[SW] 모든 캐시 삭제 완료"
          );

        })

    );

  }


  /*
     새 Service Worker 즉시 적용
  */
  if (
    event.data.type ===
    "SKIP_WAITING"
  ) {

    self.skipWaiting();

  }

});
