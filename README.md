# 북한 NEWS Monitor PWA
갤럭시 Chrome에서 HTTPS 주소로 접속한 뒤 Chrome 메뉴 → 홈 화면에 추가(또는 앱 설치)로 설치합니다.
주의: PWA는 file://로 여는 것만으로는 설치/서비스워커가 정상 동작하지 않습니다. GitHub Pages, Cloudflare Pages, Netlify 등 HTTPS 정적 호스팅에 올려야 합니다.
현재 Google News RSS 기반 MVP이며, 화면이 열려 있을 때 5분마다 갱신하고 앱을 열면 즉시 갱신합니다. 백그라운드 5분 갱신은 Android/Chrome 정책상 보장되지 않습니다.
