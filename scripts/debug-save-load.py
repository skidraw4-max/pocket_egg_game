import json
from playwright.sync_api import sync_playwright
from datetime import date

TODAY = date.today().isoformat()
SAVE = {
    "version": 3,
    "pet": {
        "name": "포코",
        "species": "기본몬",
        "stage": "child",
        "level": 12,
        "exp": 30,
        "expToNext": 100,
        "intimacy": 55,
        "birthDate": 1700000000000,
        "traits": {"power": 10, "intelligence": 8, "charm": 8, "vitality": 8},
    },
    "status": {"hunger": 15, "mood": 10, "clean": 20, "fatigue": 95},
    "coins": 999,
    "gems": 5,
    "eggColor": "pink",
    "gachaEgg": None,
    "tutorialSeen": {"main": True, "home": True, "care": True},
    "missions": {"missions": [], "lastResetDate": TODAY},
    "attendance": {"lastLoginDate": TODAY, "streak": 1, "totalDays": 1, "weeklyMissionsClaimed": True, "lastWeekStr": "2099-W01"},
    "lastSaveTime": 1700000000000,
    "collection": ["기본몬"],
    "room": {"wallpaper": "default", "furniture": []},
    "inventory": [],
    "iapPurchases": {},
    "dailyChallenges": {"challenges": [], "lastResetDate": TODAY},
    "weeklyGoals": {"goals": [], "weekStr": "2099-W01", "claimed": []},
    "claimedEvolutionRewards": [],
    "claimedCollectionRewards": [],
    "claimedIntimacyRewards": [],
    "unlockedEmotions": [],
    "friendCoins": 0,
    "nickname": "테스터",
    "ownedWallpapers": [],
    "totalPlayDays": 3,
    "fragmentExchangeDaily": {},
}

save_json = json.dumps(SAVE)
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.add_init_script(
        f"localStorage.setItem('pocket_egg_save', {json.dumps(save_json)});"
    )
    page.goto("http://localhost:3000/", wait_until="networkidle")
    raw = page.evaluate("localStorage.getItem('pocket_egg_save')")
    print("stored eggColor:", json.loads(raw).get("eggColor"))
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(1500)
    info = page.evaluate("""() => {
      const raw = localStorage.getItem('pocket_egg_save');
      const data = raw ? JSON.parse(raw) : null;
      return {
        eggColor: data?.eggColor,
        hasTitle: !!document.body.innerText.includes('게임 시작하기'),
        hasEggSpin: document.body.innerText.includes('알을 뽑는 중'),
        hasHome: document.body.innerText.includes('먹이주기') || document.body.innerText.includes('목욕'),
        bodyStart: document.body.innerText.slice(0, 200),
      };
    }""")
    print(json.dumps(info, ensure_ascii=False, indent=2))
    browser.close()
