const KAKAO_GEOCODE_ENDPOINT = 'https://dapi.kakao.com/v2/local/search/address.json';

export interface AddressSuggestion {
  id: string;
  addressName: string;
  roadAddressName?: string;
  latitude: number;
  longitude: number;
  postalCode?: string;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  addressName: string;
  roadAddressName?: string;
}

const parseKakaoResponse = (payload: any): GeocodeResult | null => {
  if (!payload || !Array.isArray(payload.documents) || payload.documents.length === 0) {
    return null;
  }
  const [first] = payload.documents;
  const address = first.address ?? first.road_address ?? {};
  const latitude = Number(first.y ?? address.y);
  const longitude = Number(first.x ?? address.x);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  const result: GeocodeResult = {
    latitude,
    longitude,
    addressName: address.address_name ?? first.address_name ?? first.road_address?.address_name ?? '',
    roadAddressName: first.road_address?.address_name,
  };
  return result;
};

const serializeSuggestion = (raw: any): AddressSuggestion | null => {
  if (!raw) {
    return null;
  }

  const address = raw.road_address ?? raw.address ?? {};
  const latitude = Number(raw.y ?? address.y);
  const longitude = Number(raw.x ?? address.x);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const addressName = address.address_name ?? raw.address_name ?? '';
  if (!addressName) {
    return null;
  }

  const roadAddressName = raw.road_address?.address_name ?? undefined;
  const postalCode = raw.road_address?.zone_no ?? raw.address?.zip_code ?? undefined;

  const idSeed = raw.address_name ?? roadAddressName ?? `${latitude}-${longitude}`;
  const id = `addr-${idSeed}-${latitude.toFixed(6)}-${longitude.toFixed(6)}`;

  return {
    id,
    addressName,
    roadAddressName,
    latitude,
    longitude,
    postalCode,
  };
};

const fetchKakaoAddressPayload = async (query: string): Promise<any> => {
  const apiKey = import.meta.env.VITE_KAKAO_REST_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error('Kakao REST API key missing. Please set VITE_KAKAO_REST_API_KEY in your environment.');
  }
  const url = `${KAKAO_GEOCODE_ENDPOINT}?query=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${apiKey}`,
    },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Kakao address lookup failed: ${response.status} ${message}`);
  }
  return response.json();
};

export const geocodeKoreanAddress = async (query: string): Promise<GeocodeResult | null> => {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }
  const payload = await fetchKakaoAddressPayload(trimmed);
  return parseKakaoResponse(payload);
};

export const searchKoreanAddresses = async (query: string): Promise<AddressSuggestion[]> => {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }
  const payload = await fetchKakaoAddressPayload(trimmed);
  if (!payload || !Array.isArray(payload.documents)) {
    return [];
  }
  return payload.documents
    .map(serializeSuggestion)
    .filter((item: AddressSuggestion | null): item is AddressSuggestion => Boolean(item));
};
