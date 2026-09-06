/* =========================================================
   북한 NEWS Monitor
   sw.js
   ========================================================= */

/*
 * 중요:
 * 앱 파일을 수정할 때마다 VERSION을 올려주세요.
 *
 * 현재:
 * v2026.09.06.01
 */

const VERSION = "v2026.09.06.01";

const CACHE_NAME =
  `nk-news-monitor-${VERSION}`;

/*
 * GitHub Pages 하위 경로에서도 동작하도록
 * 반드시 ./ 상대경로를 사용합니다.
 *
 * news.yml은 여기에 넣지 않습니다.
 *
 * 뉴스 데이터는 항상 네트워크에서 가져오도록 합니다.
 */

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];


/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener(
  "install",
  (event) => {

    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => {

          return cache.addAll(
            STATIC_ASSETS
          );

        })
        .then(() => {

          /*
           * 새 서비스워커를 바로 활성화
           */
          return self.skipWaiting();

        })
    );

  }
);


/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener(
  "activate",
  (event) => {

    event.waitUntil(

      caches.keys()
        .then((cacheNames) => {

          return Promise.all(

            cacheNames
              .filter(
                (name) =>
                  name.startsWith(
                    "nk-news-monitor-"
                  ) &&
                  name !== CACHE_NAME
              )
              .map(
                (name) =>
                  caches.delete(name)
              )

          );

        })
        .then(() => {

          /*
           * 현재 열린 페이지도
           * 새 서비스워커가 바로 제어
           */
          return self.clients.claim();

        })

    );

  }
);


/* =========================================================
   MESSAGE
   ========================================================= */

self.addEventListener(
  "message",
  (event) => {

    if (
      event.data &&
      event.data.type === "SKIP_WAITING"
    ) {
      self.skipWaiting();
    }

  }
);


/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener(
  "fetch",
  (event) => {

    const request =
      event.request;

    /*
     * GET 이외의 요청은 건드리지 않습니다.
     */
    if (request.method !== "GET") {
      return;
    }

    const url =
      new URL(
        request.url
      );

    /*
     * -----------------------------------------------------
     * news.yml
     * -----------------------------------------------------
     *
     * 가장 중요합니다.
     *
     * 뉴스 데이터는 캐시하지 않습니다.
     * 항상 네트워크에서 최신 파일을 요청합니다.
     */

    if (
      url.pathname.endsWith(
        "/news.yml"
      )
    ) {

      event.respondWith(

        fetch(
          new Request(
            request,
            {
              cache: "no-store"
            }
          )
        )

      );

      return;
    }


    /*
     * -----------------------------------------------------
     * 외부 사이트
     * -----------------------------------------------------
     *
     * 다른 도메인의 요청은 서비스워커가
     * 가로채지 않습니다.
     */

    if (
      url.origin !==
      self.location.origin
    ) {
      return;
    }


    /*
     * -----------------------------------------------------
     * 앱 파일
     * -----------------------------------------------------
     *
     * 앱 파일은 캐시 우선.
     * 없으면 네트워크에서 가져옵니다.
     */

    event.respondWith(

      caches.match(request)
        .then((cached) => {

          if (cached) {
            return cached;
          }

          return fetch(request)
            .then((response) => {

              /*
               * 정상 응답만 캐시
               */
              if (
                response &&
                response.status === 200 &&
                response.type === "basic"
              ) {

                const copy =
                  response.clone();

                caches.open(
                  CACHE_NAME
                ).then((cache) => {

                  cache.put(
                    request,
                    copy
                  );

                });

              }

              return response;

            });

        })

    );

  }
);
