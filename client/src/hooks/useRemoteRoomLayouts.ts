import { useEffect } from 'react';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import { setRemoteRoomLayoutOverrides } from '@/data/roomLayouts';
import type { DecorLayoutMap } from '@/data/roomLayouts';

/** Firebase config/roomLayouts 원격 preset 구독 */
export function useRemoteRoomLayouts() {
  useEffect(() => {
    const layoutsRef = ref(db, 'config/roomLayouts');
    return onValue(
      layoutsRef,
      snap => {
        const val = snap.val();
        if (val && typeof val === 'object') {
          setRemoteRoomLayoutOverrides(val as Partial<Record<string, DecorLayoutMap>>);
        }
      },
      () => {
        setRemoteRoomLayoutOverrides({});
      },
    );
  }, []);
}
