interface KakaoGlobal {
  maps?: any;
}

declare global {
  interface Window {
    kakao?: KakaoGlobal;
  }
}

const KAKAO_MAP_SDK_BASE = 'https://dapi.kakao.com/v2/maps/sdk.js';
let kakaoMapsPromise: Promise<any> | null = null;

export const DEFAULT_KAKAO_CENTER = { lat: 37.5665, lng: 126.978 }; // Seoul City Hall as fallback

const appendKakaoScript = (appKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-kakao-maps-sdk]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', event => reject(event), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `${KAKAO_MAP_SDK_BASE}?appkey=${appKey}&autoload=false`;
    script.defer = true;
    script.dataset.kakaoMapsSdk = 'true';
    script.onload = () => resolve();
    script.onerror = event => reject(event);
    document.head.appendChild(script);
  });
};

export const loadKakaoMaps = async (): Promise<any> => {
  if (typeof window === 'undefined') {
    throw new Error('Kakao Maps SDK cannot be loaded server-side.');
  }

  if (window.kakao?.maps) {
    return window.kakao.maps;
  }

  if (kakaoMapsPromise) {
    return kakaoMapsPromise;
  }

  const appKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY as string | undefined;
  if (!appKey) {
    throw new Error('Missing Kakao Maps JavaScript key. Set VITE_KAKAO_JAVASCRIPT_KEY in your environment.');
  }

  kakaoMapsPromise = appendKakaoScript(appKey)
    .then(
      () =>
        new Promise<any>((resolve, reject) => {
          if (!window.kakao?.maps) {
            reject(new Error('Kakao Maps global object unavailable after script load.'));
            return;
          }
          window.kakao.maps.load(() => {
            if (!window.kakao?.maps) {
              reject(new Error('Kakao Maps SDK failed to initialise.'));
              return;
            }
            resolve(window.kakao.maps);
          });
        })
    )
    .catch(error => {
      kakaoMapsPromise = null;
      throw error instanceof Error ? error : new Error('Failed to load Kakao Maps SDK.');
    });

  return kakaoMapsPromise;
};
