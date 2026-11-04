import { useEffect, useState } from 'react';

import { onAuthChanged } from './firebase';

import GrantPage from './pages/GrantPage';

import LoginPage from './pages/LoginPage';

import RoomLayoutPage from './pages/RoomLayoutPage';



type AdminTab = 'grant' | 'room';



export default function App() {

  const [ready, setReady] = useState(false);

  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [tab, setTab] = useState<AdminTab>('grant');



  useEffect(() => {

    return onAuthChanged((user) => {

      setUserEmail(user?.email ?? null);

      setReady(true);

    });

  }, []);



  if (!ready) {

    return (

      <div className="page">

        <div className="card">

          <p className="subtitle">불러오는 중…</p>

        </div>

      </div>

    );

  }



  if (!userEmail) {

    return <LoginPage onLoggedIn={() => {}} />;

  }



  if (tab === 'room') {

    return <RoomLayoutPage adminEmail={userEmail} onBack={() => setTab('grant')} />;

  }



  return (

    <>

      <div className="page" style={{ paddingBottom: 0 }}>

        <div className="row" style={{ gap: 8, marginBottom: 8 }}>

          <button type="button" onClick={() => setTab('grant')}>플레이어/보상</button>

          <button type="button" className="secondary" onClick={() => setTab('room')}>Room Layout</button>

        </div>

      </div>

      <GrantPage adminEmail={userEmail} />

    </>

  );

}


