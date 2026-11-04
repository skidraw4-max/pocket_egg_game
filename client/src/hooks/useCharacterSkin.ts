import { useCallback, useEffect, useState } from 'react';
import {
  type CharacterSkin,
  getActiveSkin,
  getCharacterImage,
  setActiveSkin as persistSkin,
  SKIN_CHANGED_EVENT,
} from '@/lib/speciesRegistry';
import type { PetStage } from '@/lib/speciesRegistry';

export function useCharacterSkin() {
  const [skin, setSkinState] = useState<CharacterSkin>(() => getActiveSkin());

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CharacterSkin>).detail;
      setSkinState(detail ?? getActiveSkin());
    };
    window.addEventListener(SKIN_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SKIN_CHANGED_EVENT, handler);
  }, []);

  const setSkin = useCallback((next: CharacterSkin) => {
    persistSkin(next);
    setSkinState(next);
  }, []);

  return { skin, setSkin };
}

export function useCharacterImage(species: string, stage: PetStage): string {
  const { skin } = useCharacterSkin();
  return getCharacterImage(species, stage, skin);
}
